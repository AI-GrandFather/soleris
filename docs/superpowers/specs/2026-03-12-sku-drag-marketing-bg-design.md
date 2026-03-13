# Design: SKU Drag-and-Drop, Marketing Column, Background Color Picker

Date: 2026-03-12

## Overview

Three independent improvements to the Soleris dashboard:
1. Replace up/down SKU move buttons with drag-and-drop reordering
2. Add a marketing expense column to the Profit Calculator
3. Add a background color picker to the theme system (light mode only)

---

## 1. SKU Drag-and-Drop Reordering

### Problem
SKUs in the SKU Planner and Profit Calculator currently use up/down arrow buttons to reorder. This is slow and unintuitive for more than a few items.

### Design

**Handle style:** Always-visible ⠿ grip icon at the left edge of each SKU row. Cursor changes to `grab` on hover.

**Interaction:**
- User drags a row by the grip handle
- Row being dragged shows a semi-transparent highlight style (gold-tinted border) while in flight
- A drop indicator line appears between rows to show the insertion point
- On drop, `sort_order` values are updated immediately via API

**API:** Add a new `PATCH /api/skus/:id/sort-order` endpoint that accepts `{ sort_order: number }`. Use integer renumbering on drop: after a drop, reassign `sort_order = 1, 2, 3…` to all SKUs in the category in their new order. This is done in a single transaction and avoids floating-point precision degradation. The endpoint must be registered before `PUT /:id` in `skus.js` to avoid Express matching `sort-order` as the `:id` parameter — or use `PATCH` method to sidestep the conflict entirely.

**Scope:**
- `SkuPlanner.jsx`: remove `MoveButtons` component, add drag handle + HTML5 drag-and-drop event handlers
- `ProfitCalculator.jsx`: remove `SkuMoveButtons` component, same drag handle treatment
- `server/routes/skus.js`: add `PATCH /:id/sort-order` endpoint (registered before `PUT /:id` to avoid Express routing conflict); `POST /:id/move` can remain but goes unused

**State:** No React state needed beyond existing SKU list. On successful drop, re-fetch or optimistically reorder the local array.

**Cross-category drops in ProfitCalculator:** The Profit Calculator renders all SKUs in a single flat grid grouped by category. Each `draggable` row must carry a `data-category-id` attribute. In the `dragover` and `drop` handlers, if the dragged row's `data-category-id` differs from the target row's `data-category-id`, the drop is rejected: call `event.preventDefault()` to cancel, show `dropEffect = "none"` cursor, and do not call the API. No visual error is needed — the native browser "no drop" cursor is sufficient feedback.

---

## 2. Marketing Expense Column in Profit Calculator

### Problem
The Profit Calculator has no place to record per-unit marketing spend (ads, influencer fees, promotions), so profit figures are overstated for SKUs with marketing costs.

### Design

**Column placement:** After "Other Costs", immediately before "Profit/Unit". This keeps all deduction columns grouped together: Unit Cost → Shipping → Other → Marketing → Profit.

**Column label:** `Mktg $` in the header, editing shows full label "Marketing $".

**Formula change:**
```
Profit/Unit = selling_price − unit_cost − shipping_cost − other_costs − marketing_cost
```

**Database:** Add `marketing_cost_usd REAL NOT NULL DEFAULT 0` to the `skus` table via migration in `db.js`.

**API:**
- `PUT /api/skus/:id`: add `marketing_cost_usd` to the update fields
- `POST /api/skus`: include `marketing_cost_usd` in insert (defaults to 0)

**Grid layout:** Update `GRID` constant in `ProfitCalculator.jsx` to add one column (currently 11 columns in template string, becomes 12).

**Scope:**
- `server/db.js`: migration `ALTER TABLE skus ADD COLUMN marketing_cost_usd REAL NOT NULL DEFAULT 0`
- `server/routes/skus.js`: include `marketing_cost_usd` in POST insert and PUT update (with `?? existing.marketing_cost_usd` null-coalescing)
- `client/src/components/ProfitCalculator.jsx`:
  - Add column to `GRID` template, header row, and `SkuProfitRow` editable cell
  - Update per-row profit formula: `sell − unit_cost − shipping − other − marketing`
  - Update the totals reducer at the bottom of the component to also subtract `marketing_cost_usd`
- `client/src/components/SkuPlanner.jsx`: no UI change needed; `SkuRow.save()` omits `marketing_cost_usd` from its PUT payload, which is safe — the server's null-coalescing preserves the existing value

---

## 3. Background Color Picker (Light Mode)

### Problem
The light theme uses a single warm cream background (`#F3EFE6`). Users may prefer a cleaner white or neutral background for different working environments.

### Design

**Options (all 4):**
| Name | Value | Character |
|---|---|---|
| Warm Cream | `#F3EFE6` | Current default, warm parchment |
| Off-White | `#F8F8F8` | Neutral, slightly grey, reduces glare |
| Pure White | `#FFFFFF` | High contrast, clean |
| Cool Grey-White | `#F0F2F5` | Subtle blue-grey, airy modern feel |

**Persistence:** Selected background stored in `localStorage` under key `soleris-bg`. Applied as a `data-bg` attribute on `<html>` (e.g. `data-bg="offwhite"`).

**CSS variables:** Each `[data-theme="light"][data-bg="X"]` block overrides `--bg-page` and related page-level background variables.

**Dark mode:** Unaffected — background picker only applies in light mode. `data-bg` attribute is still set but light-specific CSS rules don't fire in dark mode.

**Theme picker placement:** New row added to the `ThemePicker` popover in `Navigation.jsx`, below the accent swatches and Dark/Light tab strip. Shows 4 small colored squares labeled with the background name.

**Scope:**
- `client/src/index.css`: add `[data-bg="X"]` overrides under `[data-theme="light"]`
- `client/src/App.jsx`: add `bg` state, `setBg` callback, `data-bg` effect
- `client/src/components/Navigation.jsx`: add background row to `ThemePicker` popover

---

## Implementation Order

1. Marketing column (DB migration + API + UI) — self-contained, no interaction with other two
2. Background color picker (CSS + state + ThemePicker) — purely additive, no conflicts
3. Drag-and-drop reordering — touches both SkuPlanner and ProfitCalculator, do last

---

## Out of Scope

- Dark mode background variants (only light mode backgrounds are configurable)
- Drag-and-drop across categories (SKUs stay in their category)
- Marketing cost in the SKU Planner view (only Profit Calculator)
