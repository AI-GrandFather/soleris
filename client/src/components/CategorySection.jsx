import { useState } from 'react';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import SkuPlanner from './SkuPlanner.jsx';

const PALETTE = ['#C9A030', '#E8802A', '#4BA36C', '#4878B0', '#8B5CF6', '#C04444', '#16A3A3'];

function CategoryRow({ cat, expenses, onAddExpense, onEdit, onDelete, onCategoryUpdated, inventoryRefreshToken }) {
  const { rates, fmtFixed } = useCurrency();
  const [expanded, setExpanded] = useState(false);

  const isInventory = cat.name.toLowerCase() === 'inventory';
  const catExpenses = expenses.filter(e => e.category_id === cat.id);
  const pkrRate = rates.PKR || 278.5;
  const spentPkr = cat.spent_pkr ?? ((cat.spent_usd ?? 0) * pkrRate);
  const budgetPkr = cat.budget_pkr ?? ((cat.budget_usd ?? 0) * pkrRate);
  const pct = budgetPkr > 0 ? Math.min((spentPkr / budgetPkr) * 100, 100) : 0;
  const over = spentPkr > budgetPkr;

  return (
    <div
      style={{
        border: '1px solid var(--border-dim)',
        background: 'var(--bg-card)',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-med)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-dim)'}
    >
      {/* Row header */}
      <div
        className="flex items-center gap-3 cursor-pointer"
        style={{ padding: '14px 16px' }}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="cat-badge" style={{ background: cat.color, flexShrink: 0 }} />
        <span style={{
          flex: 1,
          fontFamily: 'var(--font-ui)',
          fontWeight: 500,
          fontSize: '0.875rem',
          color: 'var(--text-primary)',
          letterSpacing: '0.01em',
        }}>
          {cat.name}
        </span>

        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: over ? 'var(--red)' : 'var(--text-secondary)',
          letterSpacing: '0.04em',
        }}>
          <span className="currency-val">{fmtFixed(spentPkr, 'PKR')}</span>
          <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
          <span className="currency-val">{fmtFixed(budgetPkr, 'PKR')}</span>
        </span>

        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          color: over ? 'var(--red)' : 'var(--text-muted)',
          letterSpacing: '0.05em',
          minWidth: 40,
          textAlign: 'right',
        }}>
          {pct.toFixed(0)}%
        </span>

        {/* Action buttons */}
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          {!isInventory && (
            <button
              onClick={() => onAddExpense(cat)}
              title="Log expense"
              style={{
                width: 26, height: 26,
                background: 'transparent',
                border: '1px solid var(--border-dim)',
                color: 'var(--gold)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.1s, border-color 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold-dim)'; e.currentTarget.style.borderColor = 'var(--border-gold)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-dim)'; }}
            >+</button>
          )}
          <button
            onClick={() => onEdit(cat)}
            title="Edit"
            style={{
              width: 26, height: 26,
              background: 'transparent',
              border: '1px solid var(--border-dim)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M7 1L9 3L3 9H1V7L7 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={() => onDelete(cat.id)}
            title="Delete"
            style={{
              width: 26, height: 26,
              background: 'transparent',
              border: '1px solid var(--border-dim)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Expand chevron */}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-muted)' }}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Progress bar */}
      <div className="progress-track" style={{ margin: '0 16px 14px' }}>
        <div
          className="progress-fill"
          style={{
            width: `${pct}%`,
            background: over ? 'var(--red)' : `linear-gradient(to right, ${cat.color}, ${cat.color}cc)`,
          }}
        />
      </div>

      {/* Expanded section */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-dim)' }}>
          {isInventory ? (
            <SkuPlanner
              categoryId={cat.id}
              category={cat}
              onInventoryChanged={onCategoryUpdated}
              refreshToken={inventoryRefreshToken}
            />
          ) : (
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {catExpenses.length === 0 ? (
                <button
                  onClick={() => onAddExpense(cat)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.08em',
                    transition: 'color 0.1s, background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.background = 'var(--gold-glow)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  + ADD ENTRY
                </button>
              ) : (
                catExpenses.map(exp => (
                  <div
                    key={exp.id}
                    className="flex items-center"
                    style={{ padding: '9px 16px', borderBottom: '1px solid var(--border-dim)', gap: 12 }}
                  >
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.65rem',
                      color: 'var(--text-muted)',
                      letterSpacing: '0.04em',
                      flexShrink: 0,
                    }}>
                      {exp.date}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {exp.description}
                      {exp.note && (
                        <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: '0.72rem' }}>— {exp.note}</span>
                      )}
                    </span>
                    <span className="currency-val" style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: 'var(--text-primary)',
                      letterSpacing: '0.03em',
                    }}>
                      {fmtFixed(exp.amount_usd * pkrRate, 'PKR')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EditCategoryModal({ cat, onSave, onClose }) {
  const [name,   setName]   = useState(cat?.name || '');
  const [budget, setBudget] = useState(() => String(Math.round(cat?.budget_pkr || 0)));
  const [color,  setColor]  = useState(cat?.color || PALETTE[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !budget) return;
    onSave({ name: name.trim(), budget_pkr: parseFloat(budget) || 0, color });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ width: 380 }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-dim)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 400, color: 'var(--text-primary)' }}>
            {cat?.id ? 'Edit Category' : 'New Category'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Name</label>
            <input className="ledger-input" value={name} onChange={e => setName(e.target.value)} placeholder="Category name" required />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Budget (PKR)</label>
            <input className="ledger-input" type="number" min="0" step="1" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0" required />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Color</label>
            <div className="flex gap-2 flex-wrap">
              {PALETTE.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{
                  width: 26, height: 26,
                  background: c,
                  border: color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'transform 0.1s',
                  transform: color === c ? 'scale(1.15)' : 'scale(1)',
                }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CategorySection({ categories, expenses, onAddExpense, onCategoryUpdated, inventoryRefreshToken }) {
  const [editTarget,    setEditTarget]    = useState(null);
  const [showNewModal,  setShowNewModal]  = useState(false);

  const handleSave = async (data) => {
    if (editTarget?.id) {
      await fetch(`/api/categories/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }
    setEditTarget(null);
    setShowNewModal(false);
    onCategoryUpdated();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category and all its expenses?')) return;
    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    onCategoryUpdated();
  };

  return (
    <section style={{ animation: 'fadeSlideUp 0.5s 0.2s both' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            fontWeight: 400,
            color: 'var(--text-primary)',
            letterSpacing: '0.01em',
          }}>
            Budget Categories
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: 2 }}>
            {categories.length} CATEGORIES
          </p>
        </div>
        <button
          className="btn-ghost"
          onClick={() => { setEditTarget({}); setShowNewModal(true); }}
          style={{ fontSize: '0.7rem', padding: '7px 14px' }}
        >
          + Add
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {categories.map(cat => (
          <CategoryRow
            key={cat.id}
            cat={cat}
            expenses={expenses}
            onAddExpense={onAddExpense}
            onEdit={(c) => { setEditTarget(c); setShowNewModal(true); }}
            onDelete={handleDelete}
            onCategoryUpdated={onCategoryUpdated}
            inventoryRefreshToken={inventoryRefreshToken}
          />
        ))}
        {categories.length === 0 && (
          <div style={{
            border: '1px dashed var(--border-dim)',
            padding: '32px 24px',
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
          }}>
            NO CATEGORIES — ADD ONE ABOVE
          </div>
        )}
      </div>

      {showNewModal && (
        <EditCategoryModal
          cat={editTarget}
          onSave={handleSave}
          onClose={() => { setShowNewModal(false); setEditTarget(null); }}
        />
      )}
    </section>
  );
}
