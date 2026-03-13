import { Router } from 'express';
import db from '../db.js';

const router = Router();

function getPkrRate() {
  return db.prepare("SELECT rate FROM exchange_rates WHERE currency = 'PKR'").get()?.rate || 278.5;
}

router.get('/', (req, res) => {
  const pkrRate = getPkrRate();
  const categories = db.prepare(`
    SELECT c.*,
      COALESCE(SUM(e.amount_usd), 0) +
      COALESCE((SELECT SUM(unit_price_usd * quantity) FROM skus WHERE category_id = c.id), 0)
      as spent_usd
    FROM categories c
    LEFT JOIN expenses e ON e.category_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at ASC
  `).all().map(category => ({
    ...category,
    spent_pkr: category.spent_usd * pkrRate,
  }));
  res.json(categories);
});

router.post('/', (req, res) => {
  const { name, budget_pkr = 0, color = '#C9A030' } = req.body;
  const result = db.prepare(
    'INSERT INTO categories (name, budget_usd, budget_pkr, color) VALUES (?, ?, ?, ?)'
  ).run(name, 0, budget_pkr, color);
  const category = db.prepare(
    'SELECT *, 0 as spent_usd, 0 as spent_pkr FROM categories WHERE id = ?'
  ).get(result.lastInsertRowid);
  res.status(201).json(category);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  const { name, budget_usd, budget_pkr, color } = req.body;
  db.prepare(
    'UPDATE categories SET name = ?, budget_usd = ?, budget_pkr = ?, color = ? WHERE id = ?'
  ).run(
    name ?? existing.name,
    budget_usd ?? existing.budget_usd,
    budget_pkr ?? existing.budget_pkr,
    color ?? existing.color,
    req.params.id,
  );
  const pkrRate = getPkrRate();
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
  res.json({ ...category, spent_pkr: category.spent_usd * pkrRate });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
