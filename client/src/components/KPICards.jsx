import { useState } from 'react';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

/* ── Helpers ───────────────────────────────────────────────────────── */

// Format a number in the current currency — full figures, always with commas
function fmtLocal(value, symbol) {
  const rounded = Math.round(value);
  return `${symbol}${rounded.toLocaleString('en-US')}`;
}

/* ── Budget Edit Modal ─────────────────────────────────────────────── */

function BudgetEditModal({ categories, masterBudgetUSD, onSave, onClose }) {
  const { currency, rates, symbol } = useCurrency();
  const rate = rates[currency] || 1;

  // All inputs stored in the SELECTED currency
  const toLocal = (usd) => {
    const v = (usd || 0) * rate;
    return rate > 10 ? String(Math.round(v)) : v.toFixed(2);
  };

  const [masterInput, setMasterInput] = useState(() => toLocal(masterBudgetUSD));
  const [allocations, setAllocations] = useState(() =>
    categories.reduce((acc, c) => ({ ...acc, [c.id]: toLocal(c.budget_usd) }), {})
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const masterVal    = parseFloat(masterInput) || 0;
  const totalAlloc   = Object.values(allocations).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const unallocated  = masterVal - totalAlloc;
  const overAlloc    = unallocated < -0.01;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // Save master budget (convert back to USD)
      const r1 = await fetch('/api/settings/total_budget', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value_usd: masterVal / rate }),
      });
      if (!r1.ok) throw new Error('Failed to save master budget');

      // Save category allocations (convert back to USD)
      const results = await Promise.all(
        categories.map(c =>
          fetch(`/api/categories/${c.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: c.name,
              budget_usd: (parseFloat(allocations[c.id]) || 0) / rate,
              color: c.color,
            }),
          })
        )
      );
      if (results.some(r => !r.ok)) throw new Error('Failed to save one or more categories');

      onSave();
    } catch (err) {
      setError(err.message || 'Save failed. Is the server running?');
      setSaving(false);
    }
  };

  const mono = { fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase' };

  return (
    // No onClick on backdrop — prevents accidental close while editing
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: 460 }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-dim)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>
              Edit Budget
            </h2>
            <p style={{ ...mono, color: 'var(--text-muted)', marginTop: 5 }}>
              Values shown in {currency} — converted to USD on save
            </p>
          </div>
          <button onClick={onClose} className="icon-btn" style={{ width: 30, height: 30, flexShrink: 0 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Master budget field */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-elevated)' }}>
          <div style={{ ...mono, color: 'var(--text-secondary)', marginBottom: 8 }}>Master Total Budget</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '1rem', color: 'var(--gold)', flexShrink: 0, minWidth: 18 }}>
              {symbol}
            </span>
            <input
              className="ledger-input"
              type="number"
              min="0"
              step="1"
              value={masterInput}
              onChange={e => setMasterInput(e.target.value)}
              style={{ fontSize: '1rem', fontWeight: 600 }}
              autoFocus
            />
          </div>
        </div>

        {/* Category allocation rows */}
        <div style={{ padding: '4px 24px', maxHeight: 340, overflowY: 'auto' }}>
          <div style={{ ...mono, color: 'var(--text-muted)', padding: '10px 0 4px' }}>
            Category Allocations
          </div>

          {categories.map(cat => {
            const prevLocal = parseFloat(toLocal(cat.budget_usd));
            const curVal    = parseFloat(allocations[cat.id]) || 0;
            const changed   = Math.abs(curVal - prevLocal) > 0.5;

            return (
              <div key={cat.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-dim)' }}>
                <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1 }}>
                    {cat.name}
                  </span>
                  <span style={{ ...mono, color: changed ? 'var(--gold)' : 'var(--text-muted)', fontSize: '0.58rem' }}>
                    was {fmtLocal(prevLocal, symbol)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', color: 'var(--text-muted)', flexShrink: 0, minWidth: 18 }}>
                    {symbol}
                  </span>
                  <input
                    className="ledger-input"
                    type="number"
                    min="0"
                    step="1"
                    value={allocations[cat.id]}
                    onChange={e => setAllocations(p => ({ ...p, [cat.id]: e.target.value }))}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Allocation summary + actions */}
        <div style={{ padding: '14px 24px 20px' }}>
          {/* Allocated vs Unallocated bar */}
          <div style={{
            padding: '12px 14px',
            background: overAlloc ? 'rgba(192,68,68,0.08)' : 'var(--bg-elevated)',
            border: `1px solid ${overAlloc ? 'rgba(192,68,68,0.3)' : 'var(--border-dim)'}`,
            borderRadius: 6,
            marginBottom: 14,
          }}>
            <div className="flex justify-between" style={{ marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Allocated
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.12em', color: overAlloc ? 'var(--red)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                {overAlloc ? 'Over by' : 'Unallocated'}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {fmtLocal(totalAlloc, symbol)}
              </span>
              <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '1.05rem', color: overAlloc ? 'var(--red)' : 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                {fmtLocal(Math.abs(unallocated), symbol)}
              </span>
            </div>
            {masterVal > 0 && (
              <div style={{ marginTop: 8, height: 3, background: 'var(--bg-hover)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((totalAlloc / masterVal) * 100, 100)}%`,
                  background: overAlloc ? 'var(--red)' : 'var(--gold)',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            )}
          </div>

          {error && (
            <div style={{
              background: 'rgba(192,68,68,0.1)',
              border: '1px solid rgba(192,68,68,0.3)',
              color: 'var(--red)',
              padding: '8px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              borderRadius: 4,
              marginBottom: 12,
            }}>
              {error}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Budget'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── KPI Card ──────────────────────────────────────────────────────── */

function KPICard({ label, valueUSD, subLabel, accent, onEdit }) {
  const { fmt } = useCurrency();
  const isPercent = typeof valueUSD === 'string';

  return (
    <div
      className="kpi-card"
      onDoubleClick={onEdit || undefined}
      title={onEdit ? 'Double-click to edit' : undefined}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-dim)',
        borderTop: `2px solid ${accent || 'var(--border-dim)'}`,
        borderRadius: 8,
        padding: '22px 22px 18px',
        position: 'relative',
        overflow: 'hidden',
        cursor: onEdit ? 'default' : 'default',
      }}
    >
      {/* Corner glow */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 72, height: 72,
        background: `radial-gradient(circle at top right, ${accent}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Label row */}
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.62rem',
          letterSpacing: '0.16em',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
        {onEdit && (
          <button
            onClick={onEdit}
            title="Edit budget"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              borderRadius: 4,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Value */}
      <div
        className="currency-val"
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 'clamp(1.75rem, 2.5vw, 2.4rem)',
          fontWeight: 600,
          lineHeight: 1,
          color: accent || 'var(--text-primary)',
          letterSpacing: '-0.02em',
          marginBottom: 12,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {isPercent ? valueUSD : fmt(valueUSD)}
      </div>

      <div className="rule-gold" style={{ marginBottom: 8 }} />

      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        color: 'var(--text-muted)',
        letterSpacing: '0.05em',
      }}>
        {subLabel}
      </div>
    </div>
  );
}

/* ── KPICards ──────────────────────────────────────────────────────── */

export default function KPICards({ categories, masterBudgetUSD, onUpdated }) {
  const [editingBudget, setEditingBudget] = useState(false);

  const totalSpent = categories.reduce((s, c) => s + c.spent_usd, 0);
  const remaining  = masterBudgetUSD - totalSpent;
  const burnRate   = masterBudgetUSD > 0
    ? ((totalSpent / masterBudgetUSD) * 100).toFixed(1)
    : '0.0';

  const burnColor = parseFloat(burnRate) > 80
    ? 'var(--red)'
    : parseFloat(burnRate) > 55
      ? 'var(--gold)'
      : 'var(--green)';

  // How much of the master budget is allocated to categories
  const totalAllocated = categories.reduce((s, c) => s + c.budget_usd, 0);
  const unallocatedUSD = masterBudgetUSD - totalAllocated;

  const subLabelBudget = unallocatedUSD > 0.5
    ? `${categories.length} categories · unallocated funds remain`
    : unallocatedUSD < -0.5
      ? `${categories.length} categories · over-allocated`
      : `${categories.length} categories fully allocated`;

  return (
    <>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', paddingTop: 24 }}
      >
        <KPICard
          label="Total Budget"
          valueUSD={masterBudgetUSD}
          subLabel={subLabelBudget}
          accent="var(--blue)"
          onEdit={() => setEditingBudget(true)}
        />
        <KPICard
          label="Total Spent"
          valueUSD={totalSpent}
          subLabel="Logged expenses to date"
          accent="var(--gold)"
        />
        <KPICard
          label="Remaining"
          valueUSD={remaining}
          subLabel={remaining >= 0 ? 'Under budget' : 'Over budget'}
          accent={remaining >= 0 ? 'var(--green)' : 'var(--red)'}
        />
        <KPICard
          label="Burn Rate"
          valueUSD={`${burnRate}%`}
          subLabel="% of total budget spent"
          accent={burnColor}
        />
      </div>

      {editingBudget && (
        <BudgetEditModal
          categories={categories}
          masterBudgetUSD={masterBudgetUSD}
          onSave={() => { setEditingBudget(false); onUpdated(); }}
          onClose={() => setEditingBudget(false)}
        />
      )}
    </>
  );
}
