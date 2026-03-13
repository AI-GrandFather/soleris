import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/total_budget', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'total_budget_pkr'").get();
  res.json({ value_pkr: row ? parseFloat(row.value) : 0 });
});

router.put('/total_budget', (req, res) => {
  const { value_pkr } = req.body;
  db.prepare(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('total_budget_pkr', ?)"
  ).run(String(value_pkr));
  res.json({ value_pkr });
});

export default router;
