# Soleris Ledger

Budget and inventory dashboard with SQLite persistence, currency conversion, and an AI assistant that can inspect and update dashboard data.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Frontend runs on the Vite dev port shown in the terminal. API runs on `http://localhost:3001`.

## Environment

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini-2025-08-07
```

## Data

SQLite database: `./data/budget.db`
