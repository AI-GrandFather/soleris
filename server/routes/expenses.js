import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { category_id } = req.query;
  let query = `
    SELECT e.*, c.name as category_name, c.color as category_color
    FROM expenses e
    JOIN categories c ON c.id = e.category_id
  `;
  const params = [];
  if (category_id) {
    query += ' WHERE e.category_id = ?';
    params.push(category_id);
  }
  query += ' ORDER BY e.date DESC, e.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/daily', (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 90);
  const daily = db.prepare(`
    SELECT date, SUM(amount_usd) as total_usd
    FROM expenses
    WHERE date >= date('now', '-${days} days')
    GROUP BY date
    ORDER BY date ASC
  `).all();
  res.json(daily);
});

router.post('/', (req, res) => {
  const { category_id, amount_usd, description, date, note = '' } = req.body;
  const result = db.prepare(
    'INSERT INTO expenses (category_id, amount_usd, description, date, note) VALUES (?, ?, ?, ?, ?)'
  ).run(category_id, amount_usd, description, date, note);
  const expense = db.prepare(`
    SELECT e.*, c.name as category_name, c.color as category_color
    FROM expenses e JOIN categories c ON c.id = e.category_id
    WHERE e.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(expense);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
