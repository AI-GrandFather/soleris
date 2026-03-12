import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM exchange_rates ORDER BY currency ASC').all());
});

async function fetchLiveRates() {
  // Try multiple free APIs with no key required
  const apis = [
    'https://open.er-api.com/v6/latest/USD',
    'https://api.exchangerate-api.com/v4/latest/USD',
  ];

  for (const url of apis) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!resp.ok) continue;
      const data = await resp.json();
      const rates = data.rates || data.conversion_rates;
      if (rates && rates.CNY && rates.PKR) {
        return { CNY: rates.CNY, PKR: rates.PKR, USD: 1.0 };
      }
    } catch {
      // try next
    }
  }
  return null;
}

router.post('/fetch', async (req, res) => {
  const liveRates = await fetchLiveRates();

  if (liveRates) {
    const update = db.transaction(() => {
      for (const [currency, rate] of Object.entries(liveRates)) {
        const existing = db.prepare('SELECT is_override FROM exchange_rates WHERE currency = ?').get(currency);
        if (!existing?.is_override) {
          db.prepare(`
            INSERT OR REPLACE INTO exchange_rates (currency, rate, is_override, updated_at)
            VALUES (?, ?, 0, datetime('now'))
          `).run(currency, rate);
        }
      }
    });
    update();
  }

  res.json({
    success: !!liveRates,
    rates: db.prepare('SELECT * FROM exchange_rates').all()
  });
});

router.put('/:currency', (req, res) => {
  const { rate } = req.body;
  db.prepare(`
    INSERT OR REPLACE INTO exchange_rates (currency, rate, is_override, updated_at)
    VALUES (?, ?, 1, datetime('now'))
  `).run(req.params.currency, rate);
  res.json(db.prepare('SELECT * FROM exchange_rates WHERE currency = ?').get(req.params.currency));
});

router.post('/reset', async (req, res) => {
  db.prepare('UPDATE exchange_rates SET is_override = 0').run();
  const liveRates = await fetchLiveRates();

  if (liveRates) {
    const update = db.transaction(() => {
      for (const [currency, rate] of Object.entries(liveRates)) {
        db.prepare(`
          INSERT OR REPLACE INTO exchange_rates (currency, rate, is_override, updated_at)
          VALUES (?, ?, 0, datetime('now'))
        `).run(currency, rate);
      }
    });
    update();
  }

  res.json({
    success: true,
    rates: db.prepare('SELECT * FROM exchange_rates').all()
  });
});

export default router;
