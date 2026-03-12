import { useState, useEffect, useCallback, useRef } from 'react';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

// 10 columns — header and every row use this same template
const GRID = 'minmax(110px,1.2fr) 60px 90px 90px 82px 82px 74px 86px 56px 96px';

function toLocalStr(usd, rate) {
  const v = usd * rate;
  return rate > 10 ? String(Math.round(v)) : v.toFixed(2);
}

// Ghost input — looks like plain text, reveals an underline on hover/focus
const ghostInput = (align = 'right') => ({
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid transparent',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.82rem',
  textAlign: align,
  width: '100%',
  padding: '3px 0',
  outline: 'none',
  cursor: 'text',
});

function GhostInput({ value, onChange, onFocus, onBlur, align = 'right', color }) {
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);
  const style = {
    ...ghostInput(align),
    color: color || 'var(--text-primary)',
    borderBottomColor: focused ? 'var(--gold)' : hover ? 'var(--border-med)' : 'transparent',
    transition: 'border-color 0.15s',
  };
  return (
    <input
      type="number"
      min="0"
      step="1"
      style={style}
      value={value}
      onChange={onChange}
      onFocus={(e) => { setFocused(true); onFocus?.(); }}
      onBlur={(e) => { setFocused(false); setHover(false); onBlur?.(e); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    />
  );
}

// Each row renders 10 cells as direct grid children (Fragment)
function SkuProfitRow({ sku, rate, symbol, txnPct, txnFixed, onSave }) {
  const [nameInput, setNameInput] = useState(sku.name);
  const [nameFocused, setNameFocused] = useState(false);
  const [nameHover,   setNameHover]   = useState(false);

  const [unitInput, setUnitInput] = useState(() => toLocalStr(sku.unit_price_usd, rate));
  const [sellInput, setSellInput] = useState(() => toLocalStr(sku.selling_price_usd, rate));
  const [shipInput, setShipInput] = useState(() => toLocalStr(sku.shipping_cost_usd, rate));
  const [qtyInput,  setQtyInput]  = useState(String(sku.quantity));
  const [otherInput,setOtherInput]= useState(() => toLocalStr(sku.other_costs_usd, rate));

  const unitFocused  = useRef(false);
  const sellFocused  = useRef(false);
  const shipFocused  = useRef(false);
  const otherFocused = useRef(false);

  useEffect(() => {
    if (!unitFocused.current)  setUnitInput(toLocalStr(sku.unit_price_usd, rate));
    if (!sellFocused.current)  setSellInput(toLocalStr(sku.selling_price_usd, rate));
    if (!shipFocused.current)  setShipInput(toLocalStr(sku.shipping_cost_usd, rate));
    if (!otherFocused.current) setOtherInput(toLocalStr(sku.other_costs_usd, rate));
  }, [rate, sku.unit_price_usd, sku.selling_price_usd, sku.shipping_cost_usd, sku.other_costs_usd]);

  const unitUsd     = (parseFloat(unitInput)  || 0) / rate;
  const sellingUsd  = (parseFloat(sellInput)  || 0) / rate;
  const shippingUsd = (parseFloat(shipInput)  || 0) / rate;
  const otherUsd    = (parseFloat(otherInput) || 0) / rate;
  const qty         = parseFloat(qtyInput) || sku.quantity;

  const feeUsd         = sellingUsd * txnPct + txnFixed;
  const totalCostUsd   = unitUsd + feeUsd + shippingUsd + otherUsd;
  const profitUsd      = sellingUsd - totalCostUsd;
  const margin         = sellingUsd > 0 ? (profitUsd / sellingUsd) * 100 : 0;
  const totalProfitUsd = profitUsd * qty;

  const save = async (overrides = {}) => {
    await fetch(`/api/skus/${sku.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: nameInput.trim() || sku.name,
        unit_price_usd: unitUsd,
        quantity: qty,
        note: sku.note,
        selling_price_usd: sellingUsd,
        shipping_cost_usd: shippingUsd,
        other_costs_usd: otherUsd,
        ...overrides,
      }),
    });
    onSave();
  };

  const pc = profitUsd >= 0 ? 'var(--green)' : 'var(--red)';

  const cell = {
    padding: '11px 4px',
    borderBottom: '1px solid var(--border-dim)',
    display: 'flex',
    alignItems: 'center',
  };

  return (
    <>
      {/* Col 1: SKU name (editable) */}
      <div style={{ ...cell, paddingLeft: 0 }}>
        <input
          type="text"
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: `1px solid ${nameFocused ? 'var(--gold)' : nameHover ? 'var(--border-med)' : 'transparent'}`,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            fontWeight: 500,
            width: '100%',
            padding: '3px 0',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onFocus={() => setNameFocused(true)}
          onBlur={() => { setNameFocused(false); save({ name: nameInput.trim() || sku.name }); }}
          onMouseEnter={() => setNameHover(true)}
          onMouseLeave={() => setNameHover(false)}
        />
      </div>

      {/* Col 2: Qty */}
      <div style={{ ...cell, justifyContent: 'flex-end' }}>
        <GhostInput
          value={qtyInput}
          onChange={e => setQtyInput(e.target.value)}
          onBlur={() => save({ quantity: parseFloat(qtyInput) || 1 })}
          color="var(--text-secondary)"
        />
      </div>

      {/* Col 3: Unit Cost (editable) */}
      <div style={{ ...cell, justifyContent: 'flex-end', gap: 5 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.82rem', color: 'var(--text-muted)', flexShrink: 0 }}>{symbol}</span>
        <GhostInput
          value={unitInput}
          onChange={e => setUnitInput(e.target.value)}
          onFocus={() => { unitFocused.current = true; }}
          onBlur={e => {
            unitFocused.current = false;
            save({ unit_price_usd: (parseFloat(e.target.value) || 0) / rate });
          }}
        />
      </div>

      {/* Col 4: Sell Price (editable) */}
      <div style={{ ...cell, justifyContent: 'flex-end', gap: 5 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.82rem', color: 'var(--gold)', flexShrink: 0 }}>{symbol}</span>
        <GhostInput
          value={sellInput}
          onChange={e => setSellInput(e.target.value)}
          onFocus={() => { sellFocused.current = true; }}
          onBlur={e => {
            sellFocused.current = false;
            save({ selling_price_usd: (parseFloat(e.target.value) || 0) / rate });
          }}
          color="var(--text-primary)"
        />
      </div>

      {/* Col 5: Txn Fee (auto) */}
      <div style={{ ...cell, justifyContent: 'flex-end', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.7, flexShrink: 0 }}>{symbol}</span>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.82rem', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
          {Math.abs(Math.round(feeUsd * rate)).toLocaleString('en-US')}
        </span>
      </div>

      {/* Col 6: Shipping (editable) */}
      <div style={{ ...cell, justifyContent: 'flex-end', gap: 5 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.82rem', color: 'var(--text-muted)', flexShrink: 0 }}>{symbol}</span>
        <GhostInput
          value={shipInput}
          onChange={e => setShipInput(e.target.value)}
          onFocus={() => { shipFocused.current = true; }}
          onBlur={e => {
            shipFocused.current = false;
            save({ shipping_cost_usd: (parseFloat(e.target.value) || 0) / rate });
          }}
        />
      </div>

      {/* Col 7: Other (editable) */}
      <div style={{ ...cell, justifyContent: 'flex-end', gap: 5 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.82rem', color: 'var(--text-muted)', flexShrink: 0 }}>{symbol}</span>
        <GhostInput
          value={otherInput}
          onChange={e => setOtherInput(e.target.value)}
          onFocus={() => { otherFocused.current = true; }}
          onBlur={e => {
            otherFocused.current = false;
            save({ other_costs_usd: (parseFloat(e.target.value) || 0) / rate });
          }}
        />
      </div>

      {/* Col 8: Profit/unit */}
      <div style={{ ...cell, justifyContent: 'flex-end', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', fontWeight: 600, color: pc, flexShrink: 0 }}>
          {profitUsd < 0 ? '-' : ''}{symbol}
        </span>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.82rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: pc }}>
          {Math.abs(Math.round(profitUsd * rate)).toLocaleString('en-US')}
        </span>
      </div>

      {/* Col 9: Margin */}
      <div style={{ ...cell, justifyContent: 'flex-end' }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.82rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: pc }}>
          {margin.toFixed(1)}%
        </span>
      </div>

      {/* Col 10: Total Profit */}
      <div style={{ ...cell, justifyContent: 'flex-end', paddingRight: 0, gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', fontWeight: 700, color: pc, flexShrink: 0 }}>
          {totalProfitUsd < 0 ? '-' : ''}{symbol}
        </span>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.88rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: pc }}>
          {Math.abs(Math.round(totalProfitUsd * rate)).toLocaleString('en-US')}
        </span>
      </div>
    </>
  );
}

// Category separator row spanning all columns
function CategoryHeader({ cat }) {
  return (
    <div style={{
      gridColumn: '1 / -1',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '18px 0 8px',
      borderBottom: `2px solid ${cat.color}44`,
      marginTop: 8,
    }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: cat.color, display: 'inline-block', flexShrink: 0 }} />
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        {cat.name}
      </span>
    </div>
  );
}

const HDR_COLS = ['SKU', 'Qty', 'Unit Cost', 'Sell Price', 'Txn Fee', 'Shipping', 'Other', 'Profit/Unit', 'Margin', 'Total Profit'];

export default function ProfitCalculator({ categories }) {
  const { rates, currency, symbol } = useCurrency();
  const rate = rates[currency] || 1;

  const [skus, setSkus] = useState([]);
  const [monthlyFeeInput, setMonthlyFeeInput] = useState(() => localStorage.getItem('profit-monthly-fee') ?? '39');
  const [txnPctInput,     setTxnPctInput]     = useState(() => localStorage.getItem('profit-txn-pct')    ?? '0');
  const [txnFixedInput,   setTxnFixedInput]   = useState(() => localStorage.getItem('profit-txn-fixed')  ?? '0');

  const monthlyFeeUsd = parseFloat(monthlyFeeInput) || 0;
  const txnPct        = (parseFloat(txnPctInput)    || 0) / 100;
  const txnFixed      = parseFloat(txnFixedInput)   || 0;

  const load = useCallback(async () => {
    const res = await fetch('/api/skus');
    setSkus(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const catMap  = Object.fromEntries(categories.map(c => [c.id, c]));
  const grouped = skus.reduce((acc, sku) => {
    if (!acc[sku.category_id]) acc[sku.category_id] = [];
    acc[sku.category_id].push(sku);
    return acc;
  }, {});

  const totals = skus.reduce((acc, sku) => {
    const fee    = sku.selling_price_usd * txnPct + txnFixed;
    const cost   = sku.unit_price_usd + fee + sku.shipping_cost_usd + sku.other_costs_usd;
    const profit = sku.selling_price_usd - cost;
    acc.revenue += sku.selling_price_usd * sku.quantity;
    acc.cost    += cost    * sku.quantity;
    acc.profit  += profit  * sku.quantity;
    return acc;
  }, { revenue: 0, cost: 0, profit: 0 });

  const overallMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;
  const fmtAmt = (usd) => `${usd < 0 ? '-' : ''}${symbol}${Math.abs(Math.round(usd * rate)).toLocaleString('en-US')}`;

  const mono = { fontFamily: 'var(--font-mono)' };
  const colHdr = { ...mono, color: 'var(--text-secondary)', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 };
  const cfgInput = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.82rem',
    padding: '6px 10px',
    outline: 'none',
    width: 88,
  };

  return (
    <div style={{ animation: 'fadeSlideUp 0.4s both' }}>

      {/* Fee config bar */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 24,
        flexWrap: 'wrap',
        marginBottom: 24,
        padding: '16px 20px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-dim)',
        borderRadius: 8,
      }}>
        <div>
          <label style={{ ...colHdr, display: 'block', marginBottom: 7 }}>Monthly Fee (USD)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ ...mono, color: 'var(--text-muted)', fontSize: '0.8rem' }}>$</span>
            <input style={cfgInput} type="number" min="0" step="1" value={monthlyFeeInput} onChange={e => { setMonthlyFeeInput(e.target.value); localStorage.setItem('profit-monthly-fee', e.target.value); }} />
            <span style={{ ...mono, color: 'var(--text-muted)', fontSize: '0.7rem' }}>
              = {symbol}{Math.round(monthlyFeeUsd * rate).toLocaleString('en-US')}/mo
            </span>
          </div>
        </div>

        <div style={{ width: 1, height: 36, background: 'var(--border-dim)', alignSelf: 'center' }} />

        <div>
          <label style={{ ...colHdr, display: 'block', marginBottom: 7 }}>Per-Sale Fee (%)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input style={cfgInput} type="number" min="0" max="50" step="0.1" value={txnPctInput} onChange={e => { setTxnPctInput(e.target.value); localStorage.setItem('profit-txn-pct', e.target.value); }} />
            <span style={{ ...mono, color: 'var(--text-muted)', fontSize: '0.8rem' }}>%</span>
          </div>
        </div>

        <div>
          <label style={{ ...colHdr, display: 'block', marginBottom: 7 }}>Per-Sale Fixed (USD)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ ...mono, color: 'var(--text-muted)', fontSize: '0.8rem' }}>$</span>
            <input style={cfgInput} type="number" min="0" step="0.01" value={txnFixedInput} onChange={e => { setTxnFixedInput(e.target.value); localStorage.setItem('profit-txn-fixed', e.target.value); }} />
          </div>
        </div>

        {(txnPct > 0 || txnFixed > 0) && (
          <div style={{ ...mono, color: 'var(--text-muted)', fontSize: '0.7rem', paddingBottom: 3 }}>
            Fee/sale: <span style={{ color: 'var(--gold)' }}>
              {txnPct > 0 ? `${(txnPct * 100).toFixed(1)}%` : ''}
              {txnPct > 0 && txnFixed > 0 ? ' + ' : ''}
              {txnFixed > 0 ? `$${txnFixed.toFixed(2)}` : ''}
            </span>
          </div>
        )}
      </div>

      {skus.length === 0 ? (
        <div style={{
          border: '1px dashed var(--border-dim)',
          padding: '48px 24px',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.82rem',
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
        }}>
          NO SKUS FOUND — ADD SKUS IN THE BUDGET PLANNER FIRST
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Total Revenue', val: totals.revenue, color: 'var(--blue)' },
              { label: 'Total Cost',    val: totals.cost,    color: 'var(--gold)' },
              { label: 'Total Profit',  val: totals.profit,  color: totals.profit >= 0 ? 'var(--green)' : 'var(--red)' },
              { label: 'Profit Margin', pct: overallMargin,  color: overallMargin >= 0 ? 'var(--green)' : 'var(--red)' },
            ].map(({ label, val, pct, color }) => (
              <div key={label} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-dim)',
                borderTop: `2px solid ${color}`,
                borderRadius: 8,
                padding: '18px 20px',
              }}>
                <div style={{ ...colHdr, marginBottom: 10 }}>{label}</div>
                <div style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 'clamp(1.4rem, 2vw, 1.9rem)',
                  fontWeight: 700,
                  color,
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}>
                  {pct !== undefined ? `${pct.toFixed(1)}%` : fmtAmt(val)}
                </div>
              </div>
            ))}
          </div>

          {/* Single grid — header + all rows are direct children for perfect alignment */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: GRID, columnGap: 16, minWidth: 980 }}>

              {/* Column headers */}
              {HDR_COLS.map((h, i) => (
                <div key={h} style={{
                  ...colHdr,
                  padding: '0 4px 10px',
                  paddingLeft: i === 0 ? 0 : '4px',
                  paddingRight: i === HDR_COLS.length - 1 ? 0 : '4px',
                  textAlign: i > 1 ? 'right' : 'left',
                  borderBottom: '1px solid var(--border-med)',
                }}>
                  {h}
                </div>
              ))}

              {/* Category groups + SKU rows */}
              {Object.entries(grouped).map(([catId, catSkus]) => {
                const cat = catMap[parseInt(catId)];
                if (!cat) return null;
                return (
                  <div key={catId} style={{ display: 'contents' }}>
                    <CategoryHeader cat={cat} />
                    {catSkus.map(sku => (
                      <SkuProfitRow
                        key={sku.id}
                        sku={sku}
                        rate={rate}
                        symbol={symbol}
                        txnPct={txnPct}
                        txnFixed={txnFixed}
                        onSave={load}
                      />
                    ))}
                  </div>
                );
              })}

            </div>
          </div>

          {/* Monthly overhead strip */}
          {monthlyFeeUsd > 0 && (
            <div style={{
              marginTop: 20,
              padding: '11px 16px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-dim)',
              borderRadius: 6,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ ...mono, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                Monthly platform fee (fixed overhead — not in per-unit calculation)
              </span>
              <span style={{ ...mono, color: 'var(--gold)', fontSize: '0.85rem', fontWeight: 600 }}>
                {symbol}{Math.round(monthlyFeeUsd * rate).toLocaleString('en-US')}/month
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
