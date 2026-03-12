import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const categories = db.prepare(`
    SELECT c.*,
      COALESCE(SUM(e.amount_usd), 0) +
      COALESCE((SELECT SUM(unit_price_usd * quantity) FROM skus WHERE category_id = c.id), 0)
      as spent_usd
    FROM categories c
    LEFT JOIN expenses e ON e.category_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at ASC
  `).all();
  res.json(categories);
});

router.post('/', (req, res) => {
  const { name, budget_usd, color = '#C9A030' } = req.body;
  const result = db.prepare(
    'INSERT INTO categories (name, budget_usd, color) VALUES (?, ?, ?)'
  ).run(name, budget_usd, color);
  const category = db.prepare(
    'SELECT *, 0 as spent_usd FROM categories WHERE id = ?'
  ).get(result.lastInsertRowid);
  res.status(201).json(category);
});

router.put('/:id', (req, res) => {
  const { name, budget_usd, color } = req.body;
  db.prepare(
    'UPDATE categories SET name = ?, budget_usd = ?, color = ? WHERE id = ?'
  ).run(name, budget_usd, color, req.params.id);
  const category = db.prepare(`
    SELECT c.*,
      COALESCE(SUM(e.amount_usd), 0) +
      COALESCE((SELECT SUM(unit_price_usd * quantity) FROM skus WHERE category_id = c.id), 0)
      as spent_usd
    FROM categories c
    LEFT JOIN expenses e ON e.category_id = c.id
    WHERE c.id = ?
    GROUP BY c.id
  `).get(req.params.id);
  res.json(category);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
