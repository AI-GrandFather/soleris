import { useState, useEffect, useCallback, useRef } from 'react';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

function toLocalStr(usd, rate) {
  const v = usd * rate;
  return rate > 10 ? String(Math.round(v)) : v.toFixed(2);
}

const mono = { fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.08em' };

function SkuRow({ sku, rate, symbol, onChange, onDelete, onDragStart, onDragOver, onDrop, onDragEnd, isDragging }) {
  const [name, setName] = useState(sku.name);
  const [qty, setQty] = useState(String(sku.quantity));
  const fileInput = useRef(null);

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

  const uploadImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await fetch(`/api/skus/${sku.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: ev.target.result }),
      });
      onChange();
    };
    reader.readAsDataURL(file);
  };

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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '34px 20px 1fr 80px 110px 90px 28px',
        gap: 6,
        alignItems: 'center',
        padding: '7px 0',
        borderBottom: '1px solid var(--border-dim)',
        cursor: 'default',
        opacity: isDragging ? 0.35 : 1,
        transition: 'opacity 0.15s',
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-sku-id={sku.id}
    >
      {/* Image thumbnail — click to upload */}
      <div
        onClick={() => fileInput.current.click()}
        style={{
          width: 32,
          height: 32,
          borderRadius: 4,
          overflow: 'hidden',
          cursor: 'pointer',
          border: '1px solid var(--border-dim)',
          background: 'var(--bg-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        title="Click to upload image"
      >
        {sku.image_data
          ? <img src={sku.image_data} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
        }
      </div>
      <input type="file" accept="image/*" ref={fileInput} style={{ display: 'none' }} onChange={uploadImage} />

      {/* Drag handle — draggable is on this element only, not the row, so inputs stay usable */}
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
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
  const [draggingId, setDraggingId] = useState(null);
  const dragId = useRef(null);
  const dragOverId = useRef(null);
  const currentOrder = useRef([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/skus?category_id=${categoryId}`);
    const data = await res.json();
    setSkus(data);
    currentOrder.current = data.map(s => s.id);
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

  const reorderSkus = useCallback(async (orderedIds) => {
    if (orderedIds.length === 0) return;
    await fetch('/api/skus/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_ids: orderedIds }),
    });
    syncInventory();
  }, [syncInventory]);

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
      <div style={{ display: 'grid', gridTemplateColumns: '34px 20px 1fr 80px 110px 90px 28px', gap: 6, marginBottom: 2 }}>
        <span />
        <span />
        <span style={colHeader}>Item</span>
        <span style={{ ...colHeader, textAlign: 'right' }}>Qty</span>
        <span style={{ ...colHeader, textAlign: 'right' }}>Unit Price</span>
        <span style={{ ...colHeader, textAlign: 'right' }}>Total</span>
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
            isDragging={draggingId === sku.id}
            onDragStart={() => { dragId.current = sku.id; dragOverId.current = null; setDraggingId(sku.id); }}
            onDragOver={e => {
              e.preventDefault();
              if (dragId.current === null || dragId.current === sku.id) return;
              if (dragOverId.current === sku.id) return;
              dragOverId.current = sku.id;
              const ids = [...currentOrder.current];
              const fromIdx = ids.indexOf(dragId.current);
              const toIdx = ids.indexOf(sku.id);
              if (fromIdx === -1 || toIdx === -1) return;
              ids.splice(fromIdx, 1);
              ids.splice(toIdx, 0, dragId.current);
              currentOrder.current = ids;
              setSkus(prev => {
                const map = Object.fromEntries(prev.map(s => [s.id, s]));
                return ids.map(id => map[id]).filter(Boolean);
              });
            }}
            onDrop={() => {
              if (dragId.current === null) return;
              const ids = [...currentOrder.current];
              dragId.current = null;
              dragOverId.current = null;
              setDraggingId(null);
              reorderSkus(ids);
            }}
            onDragEnd={() => {
              if (dragId.current !== null) {
                dragId.current = null;
                dragOverId.current = null;
                load();
              }
              setDraggingId(null);
            }}
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
