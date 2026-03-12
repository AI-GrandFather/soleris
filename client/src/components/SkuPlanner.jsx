import { useState, useEffect, useCallback, useRef } from 'react';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

function toLocalStr(usd, rate) {
  const v = usd * rate;
  return rate > 10 ? String(Math.round(v)) : v.toFixed(2);
}

const mono = { fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.08em' };

function MoveButtons({ onMoveUp, onMoveDown }) {
  const btnStyle = {
    background: 'transparent',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button
        onClick={onMoveUp}
        style={btnStyle}
        title="Move up"
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path d="M2 6.5L5 3.5L8 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button
        onClick={onMoveDown}
        style={btnStyle}
        title="Move down"
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

function SkuRow({ sku, rate, symbol, onChange, onDelete, onMove }) {
  const [name, setName] = useState(sku.name);
  const [qty, setQty] = useState(String(sku.quantity));

  // Source of truth: price in USD. Display derives from priceUsd * rate.
  const [priceUsd, setPriceUsd] = useState(sku.unit_price_usd);
  const [priceInput, setPriceInput] = useState(() => toLocalStr(sku.unit_price_usd, rate));
  const priceFocused = useRef(false);

  // When rate changes (currency switch) or saved sku value changes, refresh display if not editing
  useEffect(() => {
    if (!priceFocused.current) {
      setPriceUsd(sku.unit_price_usd);
      setPriceInput(toLocalStr(sku.unit_price_usd, rate));
    }
  }, [sku.unit_price_usd, rate]);

  useEffect(() => {
    setName(sku.name);
    setQty(String(sku.quantity));
  }, [sku.name, sku.quantity]);

  const totalLocal = (parseFloat(priceInput) || 0) * (parseFloat(qty) || 0);

  const save = useCallback(async (overridePriceUsd) => {
    if (!name.trim()) return;
    const finalPriceUsd = overridePriceUsd ?? priceUsd;
    await fetch(`/api/skus/${sku.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        unit_price_usd: finalPriceUsd,
        quantity: parseFloat(qty) || 1,
        note: sku.note,
        selling_price_usd: sku.selling_price_usd,
        shipping_cost_usd: sku.shipping_cost_usd,
        other_costs_usd: sku.other_costs_usd,
      }),
    });
    onChange();
  }, [name, qty, priceUsd, sku, onChange]);

  const handlePriceFocus = () => { priceFocused.current = true; };
  const handlePriceBlur = () => {
    priceFocused.current = false;
    const localVal = parseFloat(priceInput) || 0;
    const newPriceUsd = localVal / rate;
    setPriceUsd(newPriceUsd);
    save(newPriceUsd);
  };

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    padding: '5px 8px',
    outline: 'none',
    width: '100%',
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 80px 110px 90px 60px 28px',
      gap: 6,
      alignItems: 'center',
      padding: '7px 0',
      borderBottom: '1px solid var(--border-dim)',
    }}>
      <input
        style={inputStyle}
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={() => save()}
        placeholder="SKU name"
      />
      <input
        style={{ ...inputStyle, textAlign: 'right' }}
        type="number"
        min="0"
        step="1"
        value={qty}
        onChange={e => setQty(e.target.value)}
        onBlur={() => save()}
        placeholder="Qty"
      />
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ ...mono, color: 'var(--gold)', paddingRight: 4, flexShrink: 0 }}>{symbol}</span>
        <input
          style={{ ...inputStyle, textAlign: 'right' }}
          type="number"
          min="0"
          step="0.01"
          value={priceInput}
          onChange={e => setPriceInput(e.target.value)}
          onFocus={handlePriceFocus}
          onBlur={handlePriceBlur}
          placeholder="Unit price"
        />
      </div>
      <span style={{ ...mono, color: 'var(--text-secondary)', textAlign: 'right', fontSize: '0.7rem' }}>
        {symbol}{Math.round(totalLocal).toLocaleString('en-US')}
      </span>
      <MoveButtons onMoveUp={() => onMove('up')} onMoveDown={() => onMove('down')} />
      <button
        onClick={onDelete}
        style={{
          background: 'transparent',
          border: '1px solid var(--border-dim)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          width: 26,
          height: 26,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

export default function SkuPlanner({ categoryId, category, onInventoryChanged, refreshToken }) {
  const { rates, currency, symbol } = useCurrency();
  const rate = rates[currency] || 1;
  const pkrRate = rates.PKR || 278.5;

  const [skus, setSkus] = useState([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/skus?category_id=${categoryId}`);
    const data = await res.json();
    setSkus(data);
  }, [categoryId]);

  useEffect(() => { load(); }, [load, refreshToken]);

  const syncInventory = useCallback(async () => {
    await load();
    onInventoryChanged?.();
  }, [load, onInventoryChanged]);

  const addSku = async () => {
    await fetch('/api/skus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id: categoryId, name: 'New SKU', unit_price_usd: 0, quantity: 1 }),
    });
    syncInventory();
  };

  const deleteSku = async (id) => {
    await fetch(`/api/skus/${id}`, { method: 'DELETE' });
    syncInventory();
  };

  const moveSku = async (id, direction) => {
    await fetch(`/api/skus/${id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    });
    syncInventory();
  };

  const setBudget = async () => {
    const res = await fetch(`/api/skus?category_id=${categoryId}`);
    const fresh = await res.json();
    const usd = fresh.reduce((s, sk) => s + sk.unit_price_usd * sk.quantity, 0);
    await fetch(`/api/categories/${categoryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: category.name,
        budget_usd: usd,
        budget_pkr: usd * pkrRate,
        color: category.color,
      }),
    });
    onInventoryChanged?.(usd);
    load();
  };

  const totalLocal = skus.reduce((s, sk) => s + sk.unit_price_usd * sk.quantity, 0) * rate;

  const colHeader = {
    ...mono,
    color: 'var(--text-muted)',
    fontSize: '0.6rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    paddingBottom: 4,
  };

  return (
    <div style={{ padding: '12px 16px 14px' }}>
      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 90px 60px 28px', gap: 6, marginBottom: 2 }}>
        <span style={colHeader}>Item</span>
        <span style={{ ...colHeader, textAlign: 'right' }}>Qty</span>
        <span style={{ ...colHeader, textAlign: 'right' }}>Unit Price</span>
        <span style={{ ...colHeader, textAlign: 'right' }}>Total</span>
        <span style={{ ...colHeader, textAlign: 'center' }}>Move</span>
        <span />
      </div>

      {skus.length === 0 ? (
        <div style={{ ...mono, color: 'var(--text-muted)', padding: '10px 0', letterSpacing: '0.1em' }}>
          NO SKUS — ADD ONE BELOW
        </div>
      ) : (
        skus.map(sku => (
          <SkuRow
            key={sku.id}
            sku={sku}
            rate={rate}
            symbol={symbol}
            onChange={syncInventory}
            onDelete={() => deleteSku(sku.id)}
            onMove={(direction) => moveSku(sku.id, direction)}
          />
        ))
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 }}>
        <button
          onClick={addSku}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-dim)',
            color: 'var(--gold)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            padding: '5px 12px',
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-gold)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-dim)'}
        >
          + Add SKU
        </button>

        {skus.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ ...mono, color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
              Total: {symbol}{Math.round(totalLocal).toLocaleString('en-US')}
            </span>
            <button
              onClick={setBudget}
              style={{
                background: 'var(--gold-dim)',
                border: '1px solid var(--border-gold)',
                color: 'var(--gold)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                letterSpacing: '0.1em',
                padding: '5px 10px',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              Set as Budget
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
