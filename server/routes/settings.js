import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/total_budget', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'total_budget_usd'").get();
  res.json({ value_usd: row ? parseFloat(row.value) : 0 });
});

router.put('/total_budget', (req, res) => {
  const { value_usd } = req.body;
  db.prepare(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('total_budget_usd', ?)"
  ).run(String(value_usd));
  res.json({ value_usd });
});

export default router;
