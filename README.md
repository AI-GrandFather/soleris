# Soleris Ledger

Business expense tracking dashboard. Dark editorial aesthetic, real-time currency conversion, SQLite persistence.

## Setup

```bash
npm install && npm run dev
```

Opens:
- Frontend: http://localhost:5173
- API: http://localhost:3001

## Features

- Budget categories with per-category spend tracking
- Three-currency support: USD, CNY, PKR — toggle in the nav bar
- Real-time currency conversion (rates fetched on load, cached in SQLite)
- Manual rate overrides via the settings drawer (gear icon)
- Expense logging modal with any-currency input
- Charts: allocation donut, spent vs. remaining bars, 30-day cumulative line
- Fully offline after first rate fetch

## Data

SQLite database at `./data/budget.db`. Auto-initialised on first run with default categories and exchange rates.

No API key required.
