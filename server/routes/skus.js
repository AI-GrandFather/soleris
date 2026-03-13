import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/skus?category_id=X
router.get('/', (req, res) => {
  const { category_id } = req.query;
  const rows = category_id
    ? db.prepare('SELECT * FROM skus WHERE category_id = ? ORDER BY sort_order ASC, id ASC').all(parseInt(category_id))
    : db.prepare('SELECT * FROM skus ORDER BY sort_order ASC, id ASC').all();
  res.json(rows);
});

// POST /api/skus
router.post('/', (req, res) => {
  const { category_id, name, unit_price_usd, quantity, note, marketing_cost_usd, image_data } = req.body;
  const { nextSortOrder } = db.prepare(
    'SELECT COALESCE(MAX(sort_order), 0) + 1 as nextSortOrder FROM skus WHERE category_id = ?'
  ).get(category_id);
  const result = db.prepare(
    'INSERT INTO skus (category_id, name, sort_order, unit_price_usd, quantity, note, marketing_cost_usd, image_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(category_id, name, nextSortOrder, unit_price_usd ?? 0, quantity ?? 1, note ?? '', marketing_cost_usd ?? 0, image_data ?? null);
  const row = db.prepare('SELECT * FROM skus WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

// PATCH /api/skus/reorder — reorder after drag-and-drop
// Body: { ordered_ids: [id, id, id, ...] } (all sibling SKU ids in new order)
router.patch('/reorder', (req, res) => {
  const { ordered_ids } = req.body;
  if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
    return res.status(400).json({ error: 'ordered_ids must be a non-empty array' });
  }
  const reorder = db.transaction(() => {
    ordered_ids.forEach((skuId, index) => {
      db.prepare('UPDATE skus SET sort_order = ? WHERE id = ?').run(index + 1, parseInt(skuId));
    });
  });
  reorder();
  res.json({ ok: true });
});

// PUT /api/skus/:id
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM skus WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'SKU not found' });
  const { name, unit_price_usd, quantity, note, selling_price_usd, shipping_cost_usd, other_costs_usd, marketing_cost_usd, packaging_cost_usd, image_data } = req.body;
  db.prepare(
    'UPDATE skus SET name = ?, unit_price_usd = ?, quantity = ?, note = ?, selling_price_usd = ?, shipping_cost_usd = ?, other_costs_usd = ?, marketing_cost_usd = ?, packaging_cost_usd = ?, image_data = ? WHERE id = ?'
  ).run(
    name ?? existing.name,
    unit_price_usd ?? existing.unit_price_usd,
    quantity ?? existing.quantity,
    note ?? existing.note,
    selling_price_usd ?? existing.selling_price_usd,
    shipping_cost_usd ?? existing.shipping_cost_usd,
    other_costs_usd ?? existing.other_costs_usd,
    marketing_cost_usd ?? existing.marketing_cost_usd,
    packaging_cost_usd ?? existing.packaging_cost_usd,
    'image_data' in req.body ? (image_data ?? null) : existing.image_data,
    id
  );
  const row = db.prepare('SELECT * FROM skus WHERE id = ?').get(id);
  res.json(row);
});

// DELETE /api/skus/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM skus WHERE id = ?').run(parseInt(req.params.id));
  res.json({ ok: true });
});

router.post('/:id/move', (req, res) => {
  const id = parseInt(req.params.id);
  const { direction } = req.body;
  const current = db.prepare('SELECT id, category_id, sort_order FROM skus WHERE id = ?').get(id);

  if (!current) {
    return res.status(404).json({ error: 'SKU not found' });
  }

  if (!['up', 'down'].includes(direction)) {
    return res.status(400).json({ error: 'direction must be up or down' });
  }

  const neighbor = direction === 'up'
    ? db.prepare(`
        SELECT id, sort_order
        FROM skus
        WHERE category_id = ? AND sort_order < ?
        ORDER BY sort_order DESC, id DESC
        LIMIT 1
      `).get(current.category_id, current.sort_order)
    : db.prepare(`
        SELECT id, sort_order
        FROM skus
        WHERE category_id = ? AND sort_order > ?
        ORDER BY sort_order ASC, id ASC
        LIMIT 1
      `).get(current.category_id, current.sort_order);

  if (!neighbor) {
    return res.json({ moved: false });
  }

  const swap = db.transaction(() => {
    db.prepare('UPDATE skus SET sort_order = ? WHERE id = ?').run(neighbor.sort_order, current.id);
    db.prepare('UPDATE skus SET sort_order = ? WHERE id = ?').run(current.sort_order, neighbor.id);
  });
  swap();

  res.json({ moved: true });
});

export default router;
