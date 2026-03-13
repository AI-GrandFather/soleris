# Soleris Ledger Plan

## Current State

Soleris Ledger is a full-stack budget and inventory dashboard with a React/Vite frontend, an Express API, and SQLite persistence through `better-sqlite3`.

The app currently supports:

- Budget planning across categories
- Expense logging and expense history
- Inventory SKU planning inside the Inventory category
- Profit calculation across SKUs with marketing cost column
- Currency display switching between USD, CNY, and PKR
- Exchange-rate management with live refresh and manual overrides
- Theme switching between dark and light, with a background color picker for light mode
- AI chat that can inspect and change dashboard data
- Drag-and-drop SKU reordering in both the Inventory planner and Profit Calculator

## Architecture

### Frontend

The frontend lives in `client/src` and is organized around a single dashboard shell in `App.jsx`.

Implemented UI areas:

- `Navigation.jsx`
  - brand header
  - currency switcher
  - theme toggle with background color picker (light mode only: Warm Cream, Off-White, White, Cool Grey-White)
  - exchange-rate drawer trigger
  - expense modal trigger
- `KPICards.jsx`
  - total budget
  - total spent
  - remaining budget
  - burn rate
  - master budget edit modal with category allocation editing
- `DashboardInsights.jsx`
  - decision-focused insight cards
  - over-budget detection
  - recent spend velocity
  - runway estimate
  - latest ledger activity
- `CategorySection.jsx`
  - category list
  - category create/edit/delete
  - expense drill-down per category
  - inventory category expansion into SKU planning
- `SkuPlanner.jsx`
  - add, edit, delete SKU rows
  - drag-and-drop reordering via always-visible grip handle
  - category-level inventory totals
  - set inventory total as category budget
- `Charts.jsx`
  - allocation donut chart
  - spent vs remaining bar chart
  - cumulative spend line chart
- `ProfitCalculator.jsx`
  - SKU-level contribution and margin editing including marketing cost column
  - drag-and-drop reordering (within category; cross-category drops are rejected)
  - transaction fee inputs
  - total revenue/cost/profit summary (includes marketing deduction)
- `ExpenseModal.jsx`
  - expense creation with currency conversion into USD
- `SettingsDrawer.jsx`
  - live/manual exchange-rate management
- `ChatBox.jsx`
  - floating AI assistant
  - request/response history
  - graceful error messaging

### State and Formatting

`CurrencyContext.jsx` centralizes:

- current display currency
- exchange-rate map
- amount conversion
- currency formatting
- animated currency switching state

### Styling

`client/src/index.css` provides:

- light and dark theme tokens
- typography system
- mesh/grain background treatment
- responsive layout utilities for dashboard grids
- modal, drawer, and button styles
- mobile behavior for nav and chat panel

### Backend

The backend lives in `server/`.

Implemented API routes:

- `GET/POST/PUT/DELETE /api/categories`
- `GET/POST/DELETE /api/expenses`
- `GET /api/expenses/daily`
- `GET/POST/PUT/DELETE /api/skus`
- `PATCH /api/skus/reorder` — bulk sort_order update after drag-and-drop
- `GET/PUT /api/settings/total_budget`
- `GET/POST/PUT /api/rates`
- `POST /api/rates/reset`
- `POST /api/chat`
- `GET /api/health`

### Database

`server/db.js` sets up and seeds:

- `categories`
- `expenses`
- `exchange_rates`
- `settings`
- `skus`

Current DB behavior:

- seeds default business categories
- seeds default exchange rates
- seeds total budget from category sum
- enables WAL mode
- applies column migrations for SKU profit fields and `marketing_cost_usd`
- `DATABASE_PATH` environment variable overrides the default `data/budget.db` path (used by tests)

## AI Chat

The AI assistant in `server/routes/chat.js` currently supports tool-based access to:

- dashboard snapshot
- categories
- total budget
- SKUs
- expenses

It can perform these writes:

- add/update/delete category
- set total budget
- add/update/delete SKU
- add expense

It is instructed to:

- ask follow-up questions when a request is underspecified
- avoid guessing
- confirm completed changes
- keep responses concise

Recent chat-related fixes already implemented:

- backend no longer crashes if `OPENAI_API_KEY` is missing
- chat now returns a clear configuration error instead
- root dev script now uses server watch mode
- chat UI now shows better error messages
- chat can update broader dashboard state, not only SKU rows

## Data and Business Logic Already Implemented

- Category `spent_usd` includes direct expenses plus inventory purchase totals
- Inventory category uses SKU totals as spend
- Profit calculator derives:
  - revenue
  - unit cost
  - shipping cost
  - other costs
  - marketing cost (new)
  - transaction fee impact
  - margin
  - total profit
  - formula: `profit = sell − unit_cost − txn_fee − shipping − other − marketing`
- Expense modal converts selected display currency back into USD before saving
- Budget edit modal converts current display currency back into USD before saving
- Exchange-rate drawer supports:
  - live fetch
  - overrides
  - CNY to PKR cross-rate editing

## Recent Improvements Already Present

- Added `DashboardInsights.jsx` for a decision-oriented dashboard layer
- Improved mobile layout behavior for dashboard grids and chat panel
- Fixed chart tooltip currency behavior for cumulative spend
- Fixed root dev workflow so backend changes reload during development
- Updated server dependency to a newer `better-sqlite3`
- Added `.env`-based AI configuration support in README
- Added marketing cost column to Profit Calculator (DB migration + API + UI)
- Added background color picker for light mode (Warm Cream / Off-White / White / Cool Grey-White), persisted in `localStorage`
- Replaced up/down move buttons with HTML5 drag-and-drop in SkuPlanner and ProfitCalculator
- Added `PATCH /api/skus/reorder` endpoint with integer sort_order renumbering in a single transaction
- Added automated test suite (`server/test/`) using Node.js built-in test runner (18 tests, no extra dependencies)

## Issues Faced And Fixes Applied

This section records the concrete implementation and debugging issues encountered so far, with root cause and resolution.

### 1. Chat endpoint appeared missing

Observed behavior:

- UI showed "Chat endpoint not found"

Root cause:

- the API process was not reliably running
- `better-sqlite3` had been compiled against a different Node ABI than the active runtime

Fix:

- upgraded `better-sqlite3`
- rebuilt/reinstalled server dependencies for the active Node version
- updated the root dev script to run the server in watch mode

### 2. `OPENAI_API_KEY` existed in `.env` but server still said it was missing

Observed behavior:

- `/api/chat` returned `OPENAI_API_KEY is missing on the server`

Root causes:

- server process was launched from `server/`, while `.env` was located at repo root
- chat route captured `process.env.OPENAI_API_KEY` too early during module import

Fixes:

- changed `server/index.js` to load the root `.env` explicitly
- changed `server/routes/chat.js` to create the OpenAI client lazily at request time instead of at module import

### 3. OpenAI tool schema validation failed

Observed behavior:

- OpenAI returned `Invalid schema for function 'add_category'`

Root cause:

- tool schemas were marked strict while some properties were optional

Fix:

- removed the incompatible `strict` flags from the tool definitions

### 4. AI updated SKU successfully but open inventory table stayed stale

Observed behavior:

- AI reply confirmed the change
- database changed
- open inventory table did not update until page refresh

Root causes:

- `SkuPlanner` maintained local SKU state
- parent refresh did not force the planner to reload when AI mutated inventory in the background
- `SkuRow` quantity state was initialized once and not synchronized when updated props arrived

Fixes:

- added a refresh token flow from `App.jsx` into `SkuPlanner`
- reloaded planner data when the token changed
- synchronized row-local `name` and `qty` state from fresh props

### 5. Split behavior was inconsistent

Observed behavior:

- AI could split a SKU by improvising with renaming and zeroing the original instead of replacing it cleanly

Root cause:

- there was no dedicated split tool contract, so the model improvised with generic SKU update calls

Fix:

- added a dedicated `split_sku` tool in the chat backend
- implemented split to create replacement SKUs and delete the original by default

### 6. SKU ordering could not be managed explicitly

Observed behavior:

- SKUs could only appear in insertion order
- there was no way to move them up or down from the dashboard views

Root cause:

- `skus` had no persisted ordering field
- frontend had no reorder controls

Fix:

- added `sort_order` to `skus`
- updated SKU API reads to order by `sort_order`
- added move endpoints and move buttons in both Inventory and Profit Calculator

### 7. Budget numbers mixed fixed planning budgets with exchange-rate-driven display values

Observed behavior:

- category and master budgets were being treated like display-converted values
- Advertising could show `500,000 / 0` when actual spend existed but the fixed PKR budget path was incomplete
- the dashboard still had components reading old USD-only fields while newer code expected PKR budget fields

Root causes:

- the live database was still on the older schema without `budget_pkr` and `total_budget_pkr`
- several frontend components still rendered `budget_usd` and `spent_usd`
- chat budget tools still wrote USD budget fields

Fix:

- added a fixed-PKR budget path for categories and master budget
- updated KPI cards, category rows, insights, and charts to render PKR budget values
- updated chat tools to write PKR budget fields for categories and total budget
- updated inventory "Set as Budget" to write the PKR planning budget that matches the visible inventory total
- applied the missing SQLite migration to the live `data/budget.db` so the stored schema now includes `budget_pkr`
- backfilled `total_budget_pkr` and the Advertising category PKR budget in the active database

### 8. Inventory UI did not refresh immediately after AI writes

Observed behavior:

- the assistant confirmed SKU changes, but the visible row only reflected the new quantity after a full page reload

Root cause:

- `SkuRow` stored local input state and did not synchronize from refreshed props

Fix:

- synchronized row input state from fresh SKU props so AI mutations show in realtime

### 9. AI responses felt slower than necessary

Observed behavior:

- chat replies were slower than expected even for straightforward dashboard changes

Root cause:

- the assistant was using the default reasoning path for every Responses API call

Fix:

- lowered chat reasoning effort to `low` to reduce latency for routine dashboard tasks

### 10. Currency default was not aligned with user preference

Observed behavior:

- app loaded in USD by default

Fix:

- changed currency default to PKR
- persisted selected currency in local storage

### 11. AI monetary responses did not consistently match user-facing currency

Observed behavior:

- assistant sometimes replied with USD-oriented money descriptions even while the dashboard was being used in PKR

Fix:

- updated chat instructions to default user-facing monetary responses to PKR while preserving USD as internal storage

## Strengths

- The app is small and understandable
- Data model is simple and aligned with the UI
- The AI assistant is integrated into real CRUD flows rather than being read-only
- Currency conversion is consistently treated as display logic while USD remains the source of truth
- The dashboard already has both planning and operational views

## Gaps and Suggestions

### High Priority

1. Add backend validation for all write routes.
   - Right now most routes trust request bodies.
   - Add lightweight validation for required fields and numeric coercion.
   - Return `400` for invalid payloads instead of allowing bad rows or silent defaults.

2. Add error handling on the frontend for non-chat CRUD flows.
   - Several components call `fetch` and assume success.
   - Category updates, SKU saves, and deletes should surface errors to the user.

3. Expand automated tests (partial: SKU API and profit formula covered).
   - Remaining gaps: categories, expenses, rates, settings routes
   - Chat smoke test for tool registration and config failure path
   - Run `cd server && npm test` (uses Node built-in test runner, no extra deps)

4. Normalize chat tool schemas and add a small chat smoke test.
   - The recent schema issue shows this path needs one regression test.
   - Add a test that verifies chat route initialization and tool registration.

### Medium Priority

1. Add expense editing and deletion in the UI.
   - Backend delete exists.
   - There is no full expense management workflow in the dashboard itself.

2. Add category protection rules for seeded system categories.
   - Inventory is a special category in the UI.
   - Deleting or renaming it can break user expectations.

3. Add dashboard empty/loading/error states more consistently.
   - Main dashboard has a loading state.
   - Individual widgets and forms mostly do not expose retries or partial errors.

4. Add data export.
   - CSV export for expenses, categories, and SKU profitability would be high-value for a business dashboard.

5. Add persistent AI action history.
   - Current chat history is session-local in the browser only.
   - Optional audit history would help trust and traceability.

### Lower Priority

1. Split the large client bundle.
   - `recharts` plus the full dashboard currently produce a relatively heavy build.
   - Lazy-load the profit calculator and AI chat panel.

2. Move inline styles toward reusable presentational primitives.
   - The current UI is readable, but several files are long because styling is inline.
   - This is a maintainability improvement, not an urgent bug fix.

3. Add richer settings.
   - business profile
   - date range presets
   - default fee presets
   - dashboard preferences

## Concrete Risks

- Native dependency issues can recur if Node version changes and `better-sqlite3` is not rebuilt.
- There is minimal server-side validation.
- Destructive AI actions are allowed when clearly requested, but there is no approval layer for high-impact changes.
- Several frontend save paths do not handle server failures explicitly.
- SQLite migrations are currently ad hoc inside startup code; this is workable now but will become brittle as the schema grows.

## Planned / In Progress

### SKU drag animation + SKU images (in progress)

- **Drag animation:** CSS transition on row position so rows visually slide during reorder rather than snapping
- **SKU images:** Upload an image per SKU (stored as base64 in the DB or as a file path); displayed as a small thumbnail in SkuPlanner and as a leading column in ProfitCalculator

Implementation notes:
- DB: `ALTER TABLE skus ADD COLUMN image_data TEXT` (nullable base64 data URL)
- API: `PUT /api/skus/:id` already handles arbitrary fields; add `image_data` to the update
- SkuPlanner: image thumbnail upload cell in each row; click to open file picker
- ProfitCalculator: leading image column (thumbnail, ~32px) before the SKU name

## Recommended Next Sequence

1. Add request validation to all write routes.
2. Expand test coverage to categories, expenses, rates, and chat routes.
3. Add explicit expense edit/delete flows in the UI.
4. Protect system categories like Inventory.
5. Add export and audit capabilities.
6. Lazy-load heavy dashboard modules to reduce bundle size.

## Testing

Run the test suite:

```bash
cd server && npm test
```

Test files live in `server/test/`:

| File | What it covers |
|---|---|
| `skus.test.js` | `marketing_cost_usd` API (POST/PUT/GET), `PATCH /reorder`, DB schema |
| `profit-formula.test.js` | Profit formula math including marketing deduction |

Tests use Node.js built-in `node:test` and `node:assert`. No extra dependencies. Each test run uses a fresh temporary SQLite file; the production `data/budget.db` is never touched. The `DATABASE_PATH` environment variable controls which file `db.js` opens.

## Files Most Important To Understand First

- `client/src/App.jsx`
- `client/src/components/ChatBox.jsx`
- `client/src/components/CategorySection.jsx`
- `client/src/components/SkuPlanner.jsx`
- `client/src/components/ProfitCalculator.jsx`
- `server/routes/chat.js`
- `server/routes/categories.js`
- `server/routes/expenses.js`
- `server/routes/skus.js`
- `server/db.js`

## Summary

The codebase is already a functioning budget, expense, inventory, and profit dashboard with a usable AI assistant. The most important next work is not adding more surface area. It is tightening reliability:

- validation
- tests
- safer writes
- better error states
- protection for special data

Once those are in place, the app is in a good position for exports, audit trails, and more advanced planning features.
