# SKU Drag-and-Drop, Marketing Column, Background Color Picker — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag-and-drop SKU reordering, a marketing expense column to the Profit Calculator, and a background color picker to the theme system.

**Architecture:** Three independent features implemented in order: (1) marketing column — DB migration + API + UI grid change; (2) background color picker — CSS variables + App state + ThemePicker UI; (3) drag-and-drop — new PATCH API endpoint + replace MoveButtons in both SKU components.

**Tech Stack:** Express + better-sqlite3 (server), React + Vite (client), inline styles + CSS custom properties, HTML5 Drag and Drop API, localStorage for persistence.

---

## Chunk 1: Marketing Expense Column

### Task 1: DB migration + API

**Files:**
- Modify: `server/db.js`
- Modify: `server/routes/skus.js`

- [ ] **Step 1: Add migration to `server/db.js`**

  After the existing profit-columns migration block (after line 72), add:

  ```js
  try { db.exec('ALTER TABLE skus ADD COLUMN marketing_cost_usd REAL NOT NULL DEFAULT 0'); } catch { /* exists */ }
  ```

- [ ] **Step 2: Update POST /api/skus in `server/routes/skus.js`**

  The POST handler (line 16) destructures `{ category_id, name, unit_price_usd, quantity, note }`. Add `marketing_cost_usd`:

  ```js
  const { category_id, name, unit_price_usd, quantity, note, marketing_cost_usd } = req.body;
  ```

  Update the INSERT statement to include the new field:

  ```js
  const result = db.prepare(
    'INSERT INTO skus (category_id, name, sort_order, unit_price_usd, quantity, note, marketing_cost_usd) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(category_id, name, nextSortOrder, unit_price_usd ?? 0, quantity ?? 1, note ?? '', marketing_cost_usd ?? 0);
  ```

- [ ] **Step 3: Update PUT /api/skus/:id in `server/routes/skus.js`**

  The PUT handler (line 29) destructures the body. Add `marketing_cost_usd`:

  ```js
  const { name, unit_price_usd, quantity, note, selling_price_usd, shipping_cost_usd, other_costs_usd, marketing_cost_usd } = req.body;
  ```

  Update the UPDATE statement:

  ```js
  db.prepare(
    'UPDATE skus SET name = ?, unit_price_usd = ?, quantity = ?, note = ?, selling_price_usd = ?, shipping_cost_usd = ?, other_costs_usd = ?, marketing_cost_usd = ? WHERE id = ?'
  ).run(
    name ?? existing.name,
    unit_price_usd ?? existing.unit_price_usd,
    quantity ?? existing.quantity,
    note ?? existing.note,
    selling_price_usd ?? existing.selling_price_usd,
    shipping_cost_usd ?? existing.shipping_cost_usd,
    other_costs_usd ?? existing.other_costs_usd,
    marketing_cost_usd ?? existing.marketing_cost_usd,
    id
  );
  ```

- [ ] **Step 4: Restart server and verify**

  ```bash
  cd /Users/atharmushtaq/projects/soleris
  npm run dev
  ```

  Open browser dev tools → Network → reload → check `GET /api/skus` response. Each SKU object must have `"marketing_cost_usd": 0`. If not, check that the server restarted and the migration ran.

- [ ] **Step 5: Commit**

  ```bash
  git add server/db.js server/routes/skus.js
  git commit -m "feat: add marketing_cost_usd field to skus table and API"
  ```

---

### Task 2: Profit Calculator UI — marketing column

**Files:**
- Modify: `client/src/components/ProfitCalculator.jsx`

- [ ] **Step 1: Update GRID constant (line 5)**

  The current value has 11 columns. Add one 74px column for marketing between "other" and "profit/unit":

  ```js
  const GRID = 'minmax(110px,1.2fr) 60px 90px 90px 82px 82px 74px 74px 86px 56px 96px';
  ```

  (Removed the trailing 68px "move" column — it will be replaced in Task 6. For now, keep it until drag-drop is done. Actually we should keep the move column for now and add the marketing column. We'll remove the move column in Task 6.)

  Updated with move column still present:

  ```js
  const GRID = 'minmax(110px,1.2fr) 60px 90px 90px 82px 82px 74px 74px 86px 56px 96px 68px';
  ```

- [ ] **Step 2: Update HDR_COLS (line 318)**

  Insert `'Marketing'` after `'Other'` (index 6), before `'Profit/Unit'`:

  ```js
  const HDR_COLS = ['SKU', 'Qty', 'Unit Cost', 'Sell Price', 'Txn Fee', 'Shipping', 'Other', 'Marketing', 'Profit/Unit', 'Margin', 'Total Profit', 'Move'];
  ```

- [ ] **Step 3: Add marketing state to `SkuProfitRow`**

  `SkuProfitRow` starts at line 94. Add a `marketingInput` state alongside the others:

  ```js
  const [marketingInput, setMarketingInput] = useState(() => toLocalStr(sku.marketing_cost_usd, rate));
  const marketingFocused = useRef(false);
  ```

- [ ] **Step 4: Add marketing to the sync effect**

  The `useEffect` at line 110 syncs inputs when `rate` or SKU values change. Add marketing:

  ```js
  useEffect(() => {
    if (!unitFocused.current)      setUnitInput(toLocalStr(sku.unit_price_usd, rate));
    if (!sellFocused.current)      setSellInput(toLocalStr(sku.selling_price_usd, rate));
    if (!shipFocused.current)      setShipInput(toLocalStr(sku.shipping_cost_usd, rate));
    if (!otherFocused.current)     setOtherInput(toLocalStr(sku.other_costs_usd, rate));
    if (!marketingFocused.current) setMarketingInput(toLocalStr(sku.marketing_cost_usd, rate));
  }, [rate, sku.unit_price_usd, sku.selling_price_usd, sku.shipping_cost_usd, sku.other_costs_usd, sku.marketing_cost_usd]);
  ```

- [ ] **Step 5: Compute marketingUsd and update profit formula**

  After line 125 (`const otherUsd = ...`), add:

  ```js
  const marketingUsd = (parseFloat(marketingInput) || 0) / rate;
  ```

  Update the cost/profit lines (lines 128–132):

  ```js
  const feeUsd         = sellingUsd * txnPct + txnFixed;
  const totalCostUsd   = unitUsd + feeUsd + shippingUsd + otherUsd + marketingUsd;
  const profitUsd      = sellingUsd - totalCostUsd;
  const margin         = sellingUsd > 0 ? (profitUsd / sellingUsd) * 100 : 0;
  const totalProfitUsd = profitUsd * qty;
  ```

- [ ] **Step 6: Add marketing to `save()` payload**

  In the `save` function (line 134), add `marketing_cost_usd` to the JSON body:

  ```js
  body: JSON.stringify({
    name: nameInput.trim() || sku.name,
    unit_price_usd: unitUsd,
    quantity: qty,
    note: sku.note,
    selling_price_usd: sellingUsd,
    shipping_cost_usd: shippingUsd,
    other_costs_usd: otherUsd,
    marketing_cost_usd: marketingUsd,
    ...overrides,
  }),
  ```

- [ ] **Step 7: Add marketing cell JSX in `SkuProfitRow`**

  After Col 7 (Other, around line 250), add a new Col 7.5 — Marketing:

  ```jsx
  {/* Col 7b: Marketing (editable) */}
  <div style={{ ...cell, justifyContent: 'flex-end', gap: 5 }}>
    <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.82rem', color: 'var(--text-muted)', flexShrink: 0 }}>{symbol}</span>
    <GhostInput
      value={marketingInput}
      onChange={e => setMarketingInput(e.target.value)}
      onFocus={() => { marketingFocused.current = true; }}
      onBlur={e => {
        marketingFocused.current = false;
        save({ marketing_cost_usd: (parseFloat(e.target.value) || 0) / rate });
      }}
    />
  </div>
  ```

  Place this JSX after the Other cell (`{/* Col 7: Other */}`) and before the Profit/unit cell (`{/* Col 8: Profit/unit */}`).

- [ ] **Step 8: Update totals reducer (line 356)**

  The totals reducer at line 356 computes cost without marketing. Add it:

  ```js
  const totals = skus.reduce((acc, sku) => {
    const fee    = sku.selling_price_usd * txnPct + txnFixed;
    const cost   = sku.unit_price_usd + fee + sku.shipping_cost_usd + sku.other_costs_usd + (sku.marketing_cost_usd || 0);
    const profit = sku.selling_price_usd - cost;
    acc.revenue += sku.selling_price_usd * sku.quantity;
    acc.cost    += cost    * sku.quantity;
    acc.profit  += profit  * sku.quantity;
    return acc;
  }, { revenue: 0, cost: 0, profit: 0 });
  ```

- [ ] **Step 9: Verify in browser**

  - Open Profit Calculator tab
  - Confirm "Marketing" column appears between "Other" and "Profit/Unit"
  - Enter a value — profit/unit should decrease by the entered amount
  - Reload — value should persist (was saved to DB)

- [ ] **Step 10: Commit**

  ```bash
  git add client/src/components/ProfitCalculator.jsx
  git commit -m "feat: add marketing expense column to Profit Calculator"
  ```

---

## Chunk 2: Background Color Picker

### Task 3: CSS variables for background options

**Files:**
- Modify: `client/src/index.css`

- [ ] **Step 1: Add `--bg-page` variable to `:root` (dark mode)**

  In the `:root` block, add:

  ```css
  --bg-page: #0E0E0E;
  ```

  And in `[data-theme="light"]`, set the default (Warm Cream):

  ```css
  --bg-page: #F3EFE6;
  ```

  Find where `body` or `html` sets the background and replace the hardcoded value with `var(--bg-page)`. If the background is set on `body { background: ... }`, change it to `body { background: var(--bg-page); }`.

- [ ] **Step 2: Add light-mode bg overrides**

  After the `[data-theme="light"]` block, add these rules. They only apply in light mode:

  ```css
  [data-theme="light"][data-bg="offwhite"] {
    --bg-page: #F8F8F8;
  }

  [data-theme="light"][data-bg="white"] {
    --bg-page: #FFFFFF;
  }

  [data-theme="light"][data-bg="cool"] {
    --bg-page: #F0F2F5;
  }
  ```

  The default (Warm Cream) needs no override — it's the `[data-theme="light"]` default.

- [ ] **Step 3: Verify CSS loads without errors**

  The dev server hot-reloads CSS. Check browser console for any CSS parse errors.

---

### Task 4: App state + ThemePicker UI for background picker

**Files:**
- Modify: `client/src/App.jsx`
- Modify: `client/src/components/Navigation.jsx`

- [ ] **Step 1: Add `bg` state to `App.jsx`**

  In `App()` (line 225), after the `accent` state, add:

  ```js
  const [bg, setBgState] = useState(() => {
    return localStorage.getItem('soleris-bg') || 'warm';
  });
  ```

  Add a `useEffect` to apply the `data-bg` attribute:

  ```js
  useEffect(() => {
    document.documentElement.setAttribute('data-bg', bg);
    localStorage.setItem('soleris-bg', bg);
  }, [bg]);
  ```

  Add a `setBg` callback:

  ```js
  const setBg = useCallback((b) => {
    setBgState(b);
  }, []);
  ```

- [ ] **Step 2: Thread `bg` and `setBg` down to Navigation**

  Update `Dashboard` signature and its `Navigation` render:

  ```jsx
  function Dashboard({ theme, toggleTheme, accent, setAccent, bg, setBg }) {
  ```

  In the `return`, update the `Navigation` call:

  ```jsx
  <Navigation
    onSettingsOpen={() => setSettingsOpen(true)}
    onAddExpense={() => openExpenseModal()}
    theme={theme}
    onToggleTheme={toggleTheme}
    accent={accent}
    onAccentChange={setAccent}
    bg={bg}
    onBgChange={setBg}
  />
  ```

  Update `App`'s render of `Dashboard`:

  ```jsx
  <Dashboard theme={theme} toggleTheme={toggleTheme} accent={accent} setAccent={setAccent} bg={bg} setBg={setBg} />
  ```

- [ ] **Step 3: Add `BG_OPTIONS` and background row to `ThemePicker` in `Navigation.jsx`**

  At the top of `Navigation.jsx`, after `ACCENTS`, add:

  ```js
  const BG_OPTIONS = [
    { id: 'warm',     label: 'Warm',   color: '#F3EFE6' },
    { id: 'offwhite', label: 'Off-White', color: '#F8F8F8' },
    { id: 'white',    label: 'White',  color: '#FFFFFF' },
    { id: 'cool',     label: 'Cool',   color: '#F0F2F5' },
  ];
  ```

  Update `ThemePicker` to accept `bg` and `onBgChange` props:

  ```jsx
  function ThemePicker({ theme, onToggleTheme, accent, onAccentChange, bg, onBgChange }) {
  ```

  Inside the popover, after the mode toggle `</div>`, add the background row (only shown in light mode):

  ```jsx
  {theme === 'light' && (
    <>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.55rem',
        letterSpacing: '0.14em',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        marginTop: 14,
        marginBottom: 8,
      }}>
        Background
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {BG_OPTIONS.map(opt => {
          const selected = (bg || 'warm') === opt.id;
          return (
            <button
              key={opt.id}
              title={opt.label}
              onClick={() => onBgChange(opt.id)}
              style={{
                width: 26,
                height: 26,
                borderRadius: 4,
                background: opt.color,
                border: selected ? '2px solid var(--text-primary)' : '2px solid #ccc',
                outline: selected ? '2px solid var(--gold)' : 'none',
                outlineOffset: 2,
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
                transition: 'transform 0.12s ease',
                transform: selected ? 'scale(1.18)' : 'scale(1)',
              }}
            />
          );
        })}
      </div>
    </>
  )}
  ```

  Update the `ThemePicker` usage in `Navigation`'s export to pass new props:

  ```jsx
  <ThemePicker
    theme={theme}
    onToggleTheme={onToggleTheme}
    accent={accent}
    onAccentChange={onAccentChange}
    bg={bg}
    onBgChange={onBgChange}
  />
  ```

  Update `Navigation`'s prop signature:

  ```jsx
  export default function Navigation({ onSettingsOpen, onAddExpense, theme, onToggleTheme, accent, onAccentChange, bg, onBgChange }) {
  ```

- [ ] **Step 4: Verify in browser**

  - Switch to light mode — background row should appear in theme picker
  - Click each of the 4 squares — page background should change
  - Reload — selected background should persist
  - Switch to dark mode — background row should hide

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/index.css client/src/App.jsx client/src/components/Navigation.jsx
  git commit -m "feat: add background color picker to theme menu (light mode only)"
  ```

---

## Chunk 3: Drag-and-Drop SKU Reordering

### Task 5: Server — PATCH /:id/sort-order endpoint

**Files:**
- Modify: `server/routes/skus.js`

- [ ] **Step 1: Add `PATCH /:id/sort-order` before `PUT /:id`**

  In `server/routes/skus.js`, insert this block **before** the `router.put('/:id', ...)` block (before line 29):

  ```js
  // PATCH /api/skus/:id/sort-order  — reorder after drag-and-drop
  // Body: { ordered_ids: [id, id, id, ...] }  (all sibling SKU ids in new order)
  router.patch('/:id/sort-order', (req, res) => {
    const { ordered_ids } = req.body;
    if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
      return res.status(400).json({ error: 'ordered_ids must be a non-empty array' });
    }
    const reorder = db.transaction(() => {
      ordered_ids.forEach((skuId, index) => {
        db.prepare('UPDATE skus SET sort_order = ? WHERE id = ?').run(index + 1, skuId);
      });
    });
    reorder();
    res.json({ ok: true });
  });
  ```

  Note: the endpoint accepts the full ordered list of sibling IDs and renumbers them 1, 2, 3… This avoids fractional sort_order precision issues and requires no rebalancing.

- [ ] **Step 2: Restart server and test endpoint**

  ```bash
  # Assuming server is running on port 3001 (check package.json for actual port)
  curl -X PATCH http://localhost:3001/api/skus/1/sort-order \
    -H 'Content-Type: application/json' \
    -d '{"ordered_ids":[2,1,3]}'
  # Expected: {"ok":true}
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add server/routes/skus.js
  git commit -m "feat: add PATCH /api/skus/:id/sort-order endpoint for drag-and-drop reorder"
  ```

---

### Task 6: SkuPlanner — replace MoveButtons with drag handle

**Files:**
- Modify: `client/src/components/SkuPlanner.jsx`

- [ ] **Step 1: Remove `MoveButtons` component**

  Delete the entire `MoveButtons` function (lines 11–50).

- [ ] **Step 2: Update `SkuPlanner`'s `moveSku` to use new API**

  Replace the `moveSku` function (lines 217–224) with a `reorderSkus` function:

  ```js
  const reorderSkus = useCallback(async (orderedIds) => {
    if (orderedIds.length === 0) return;
    await fetch(`/api/skus/${orderedIds[0]}/sort-order`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_ids: orderedIds }),
    });
    syncInventory();
  }, [syncInventory]);
  ```

- [ ] **Step 3: Add drag state to `SkuPlanner`**

  Inside the `SkuPlanner` component, add a ref for drag tracking:

  ```js
  const dragId = useRef(null);
  ```

- [ ] **Step 4: Update `SkuRow` to accept drag props instead of `onMove`**

  Change `SkuRow`'s props from `{ sku, rate, symbol, onChange, onDelete, onMove }` to:

  ```js
  function SkuRow({ sku, rate, symbol, onChange, onDelete, onDragStart, onDragOver, onDrop }) {
  ```

- [ ] **Step 5: Update `SkuRow` grid layout and replace move buttons with drag handle**

  Change the grid from `'1fr 80px 110px 90px 60px 28px'` to `'20px 1fr 80px 110px 90px 28px'` (added a 20px column for the drag handle at the left).

  Replace the `<MoveButtons .../>` JSX (line 158) with nothing (remove it and its column from the grid).

  Add the drag handle as the first child:

  ```jsx
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-sku-id={sku.id}
      style={{
        display: 'grid',
        gridTemplateColumns: '20px 1fr 80px 110px 90px 28px',
        gap: 6,
        alignItems: 'center',
        padding: '7px 0',
        borderBottom: '1px solid var(--border-dim)',
        cursor: 'default',
      }}
    >
      {/* Drag handle */}
      <div
        style={{
          cursor: 'grab',
          color: 'var(--text-muted)',
          fontSize: '14px',
          lineHeight: 1,
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Drag to reorder"
      >
        ⠿
      </div>

      {/* rest of inputs unchanged ... */}
  ```

  Remove the `<MoveButtons>` element from the JSX.

  Update the column headers in `SkuPlanner`'s return to match the new grid:

  ```jsx
  <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 80px 110px 90px 28px', gap: 6, marginBottom: 2 }}>
    <span />
    <span style={colHeader}>Item</span>
    <span style={{ ...colHeader, textAlign: 'right' }}>Qty</span>
    <span style={{ ...colHeader, textAlign: 'right' }}>Unit Price</span>
    <span style={{ ...colHeader, textAlign: 'right' }}>Total</span>
    <span />
  </div>
  ```

- [ ] **Step 6: Add drag event handlers in `SkuPlanner` and wire up `SkuRow`**

  Replace the `skus.map(...)` block with:

  ```jsx
  {skus.map(sku => (
    <SkuRow
      key={sku.id}
      sku={sku}
      rate={rate}
      symbol={symbol}
      onChange={syncInventory}
      onDelete={() => deleteSku(sku.id)}
      onDragStart={() => { dragId.current = sku.id; }}
      onDragOver={e => e.preventDefault()}
      onDrop={() => {
        if (dragId.current === null || dragId.current === sku.id) return;
        const newOrder = skus.map(s => s.id);
        const fromIdx = newOrder.indexOf(dragId.current);
        const toIdx   = newOrder.indexOf(sku.id);
        newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, dragId.current);
        dragId.current = null;
        reorderSkus(newOrder);
      }}
    />
  ))}
  ```

- [ ] **Step 7: Verify SkuPlanner drag-and-drop**

  - Open Budget Planner, expand a category with 3+ SKUs
  - Grab the ⠿ handle and drag a row to a new position
  - Drop — row should move, order should be reflected in the list
  - Reload page — order should persist

- [ ] **Step 8: Commit**

  ```bash
  git add client/src/components/SkuPlanner.jsx
  git commit -m "feat: replace SKU move buttons with drag-and-drop in Budget Planner"
  ```

---

### Task 7: ProfitCalculator — replace SkuMoveButtons with drag handle

**Files:**
- Modify: `client/src/components/ProfitCalculator.jsx`

- [ ] **Step 1: Remove `SkuMoveButtons` component**

  Delete the `SkuMoveButtons` function (lines 53–92).

- [ ] **Step 2: Remove `moveSku` and add `reorderSkus` in `ProfitCalculator`**

  Replace `moveSku` (lines 340–347):

  ```js
  const reorderSkus = useCallback(async (orderedIds) => {
    if (orderedIds.length === 0) return;
    await fetch(`/api/skus/${orderedIds[0]}/sort-order`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_ids: orderedIds }),
    });
    load();
  }, [load]);
  ```

  Add a `dragId` ref inside the component:

  ```js
  const dragId = useRef(null);
  ```

- [ ] **Step 3: Update GRID — remove the move column, adjust width**

  Remove the trailing `68px` from `GRID` (the old move column):

  ```js
  const GRID = 'minmax(110px,1.2fr) 60px 90px 90px 82px 82px 74px 74px 86px 56px 96px';
  ```

  Update `HDR_COLS` — remove `'Move'` from the array:

  ```js
  const HDR_COLS = ['SKU', 'Qty', 'Unit Cost', 'Sell Price', 'Txn Fee', 'Shipping', 'Other', 'Marketing', 'Profit/Unit', 'Margin', 'Total Profit'];
  ```

- [ ] **Step 4: Update `SkuProfitRow` — remove `onMove`, add drag props, replace move cell with drag handle**

  Change `SkuProfitRow`'s signature from `{ sku, rate, symbol, txnPct, txnFixed, onSave, onMove }` to:

  ```js
  function SkuProfitRow({ sku, rate, symbol, txnPct, txnFixed, onSave, onDragStart, onDragOver, onDrop }) {
  ```

  **Important:** `SkuProfitRow` returns a Fragment — cells are direct grid children. `display: contents` divs do NOT fire drag events in any browser. Instead, attach drag events to individual cells:

  - Put `draggable onDragStart={onDragStart}` on the drag handle cell only
  - Put `onDragOver={onDragOver} onDrop={onDrop}` on the SKU name cell (first content cell)

  Update GRID to add a leading 20px column and remove the trailing move column:

  ```js
  const GRID = '20px minmax(110px,1.2fr) 60px 90px 90px 82px 82px 74px 74px 86px 56px 96px';
  ```

  Update HDR_COLS — add empty first column, remove 'Move':

  ```js
  const HDR_COLS = ['', 'SKU', 'Qty', 'Unit Cost', 'Sell Price', 'Txn Fee', 'Shipping', 'Other', 'Marketing', 'Profit/Unit', 'Margin', 'Total Profit'];
  ```

  Replace the Fragment opener `<>` and add the drag handle cell as the very first cell:

  ```jsx
  return (
    <>
      {/* Col 0: drag handle — draggable, fires onDragStart */}
      <div
        draggable
        onDragStart={onDragStart}
        style={{ ...cell, justifyContent: 'center', paddingLeft: 0, cursor: 'grab', color: 'var(--text-muted)', fontSize: 14, userSelect: 'none' }}
        title="Drag to reorder"
      >
        ⠿
      </div>

      {/* Col 1: SKU name — drop target for the row */}
      <div
        onDragOver={onDragOver}
        onDrop={onDrop}
        style={{ ...cell, paddingLeft: 0 }}
      >
        <input ... (existing name input unchanged) ... />
      </div>
      {/* ... rest of cells unchanged ... */}
  ```

  Remove the last cell (move buttons):

  ```jsx
  {/* Delete this entire cell: */}
  <div style={{ ...cell, justifyContent: 'flex-end', paddingRight: 0 }}>
    <SkuMoveButtons onMove={onMove} />
  </div>
  ```

- [ ] **Step 5: Wire drag events in the category render loop**

  Find the `catSkus.map(sku => (...))` block (around line 507). Replace:

  ```jsx
  {catSkus.map(sku => (
    <SkuProfitRow
      key={sku.id}
      sku={sku}
      rate={rate}
      symbol={symbol}
      txnPct={txnPct}
      txnFixed={txnFixed}
      onSave={load}
      onDragStart={() => { dragId.current = sku.id; }}
      onDragOver={e => { e.preventDefault(); }}
      onDrop={() => {
        if (dragId.current === null || dragId.current === sku.id) return;
        // Block cross-category drops silently
        const dragSku = skus.find(s => s.id === dragId.current);
        if (!dragSku || dragSku.category_id !== sku.category_id) {
          dragId.current = null;
          return;
        }
        const siblings = catSkus.map(s => s.id);
        const fromIdx  = siblings.indexOf(dragId.current);
        const toIdx    = siblings.indexOf(sku.id);
        siblings.splice(fromIdx, 1);
        siblings.splice(toIdx, 0, dragId.current);
        dragId.current = null;
        reorderSkus(siblings);
      }}
    />
  ))}
  ```

- [ ] **Step 6: Verify ProfitCalculator drag-and-drop**

  - Open Profit Calculator tab with multiple SKUs per category
  - Drag a row to a new position within the same category — should reorder
  - Attempt to drag across categories — should have no effect
  - Reload — order should persist

- [ ] **Step 7: Commit**

  ```bash
  git add client/src/components/ProfitCalculator.jsx
  git commit -m "feat: replace SKU move buttons with drag-and-drop in Profit Calculator"
  ```

---

## Final check

- [ ] **Smoke test all three features together**
  1. Open light mode — background picker shows in theme menu, all 4 options work, persists on reload
  2. Open Budget Planner — drag SKUs to reorder, reload and verify order persists
  3. Open Profit Calculator — drag SKUs within a category, verify cross-category drag is blocked, verify marketing column is editable and affects profit totals
  4. Check browser console — no JS errors

- [ ] **Final commit if any clean-up**

  ```bash
  git add -p
  git commit -m "chore: clean up after feature implementation"
  ```
