import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/skus?category_id=X
router.get('/', (req, res) => {
  const { category_id } = req.query;
  const rows = category_id
    ? db.prepare('SELECT * FROM skus WHERE category_id = ? ORDER BY id').all(parseInt(category_id))
    : db.prepare('SELECT * FROM skus ORDER BY id').all();
  res.json(rows);
});

// POST /api/skus
router.post('/', (req, res) => {
  const { category_id, name, unit_price_usd, quantity, note } = req.body;
  const result = db.prepare(
    'INSERT INTO skus (category_id, name, unit_price_usd, quantity, note) VALUES (?, ?, ?, ?, ?)'
  ).run(category_id, name, unit_price_usd ?? 0, quantity ?? 1, note ?? '');
  const row = db.prepare('SELECT * FROM skus WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

// PUT /api/skus/:id
router.put('/:id', (req, res) => {
  const { name, unit_price_usd, quantity, note, selling_price_usd, shipping_cost_usd, other_costs_usd } = req.body;
  db.prepare(
    'UPDATE skus SET name = ?, unit_price_usd = ?, quantity = ?, note = ?, selling_price_usd = ?, shipping_cost_usd = ?, other_costs_usd = ? WHERE id = ?'
  ).run(
    name, unit_price_usd ?? 0, quantity ?? 1, note ?? '',
    selling_price_usd ?? 0, shipping_cost_usd ?? 0, other_costs_usd ?? 0,
    parseInt(req.params.id)
  );
  const row = db.prepare('SELECT * FROM skus WHERE id = ?').get(parseInt(req.params.id));
  res.json(row);
});

// DELETE /api/skus/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM skus WHERE id = ?').run(parseInt(req.params.id));
  res.json({ ok: true });
});

export default router;
