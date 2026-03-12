import { useState } from 'react';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

export default function ExpenseModal({ categories, selectedCategory, onClose, onAdded }) {
  const { rates, SYMBOLS } = useCurrency();
  const today = new Date().toISOString().slice(0, 10);

  const [categoryId, setCategoryId] = useState(selectedCategory?.id || categories[0]?.id || '');
  const [amount, setAmount]         = useState('');
  const [inputCurrency, setInputCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [date, setDate]             = useState(today);
  const [note, setNote]             = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryId || !amount || !description.trim()) {
      setError('Category, amount, and description are required.');
      return;
    }

    setSaving(true);
    setError('');

    const rate = rates[inputCurrency] ?? 1;
    const amount_usd = parseFloat(amount) / rate;

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: parseInt(categoryId),
          amount_usd,
          description: description.trim(),
          date,
          note: note.trim(),
        }),
      });
      if (!res.ok) throw new Error('Failed to save expense');
      onAdded();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const currencies = ['USD', 'CNY', 'PKR'];

  const labelStyle = {
    display: 'block',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.62rem',
    letterSpacing: '0.16em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    marginBottom: 6,
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border-dim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: 400,
              color: 'var(--text-primary)',
              lineHeight: 1,
            }}>
              Log Expense
            </h2>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.62rem',
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              marginTop: 4,
            }}>
              AMOUNT STORED IN USD BASE
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-dim)',
              color: 'var(--text-muted)',
              width: 32,
              height: 32,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {/* Category */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Category</label>
            <select
              className="ledger-input"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              required
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Amount + Currency */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Amount</label>
            <div className="flex gap-0">
              <div
                className="flex items-center"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-dim)',
                  borderRight: 'none',
                  padding: '0 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  color: 'var(--gold)',
                  letterSpacing: '0.04em',
                  flexShrink: 0,
                }}
              >
                {SYMBOLS[inputCurrency]}
              </div>
              <input
                className="ledger-input"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                style={{ borderLeft: 'none', flex: 1 }}
                required
              />
              {/* Currency selector */}
              <div className="flex" style={{ borderLeft: 'none' }}>
                {currencies.map(cur => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setInputCurrency(cur)}
                    style={{
                      padding: '0 10px',
                      background: inputCurrency === cur ? 'var(--gold-dim)' : 'var(--bg-elevated)',
                      border: '1px solid var(--border-dim)',
                      borderLeft: 'none',
                      color: inputCurrency === cur ? 'var(--gold)' : 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.62rem',
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                      transition: 'background 0.1s, color 0.1s',
                    }}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>
            {amount && inputCurrency !== 'USD' && (
              <div style={{
                marginTop: 4,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.62rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
              }}>
                ≈ ${(parseFloat(amount) / (rates[inputCurrency] || 1)).toFixed(2)} USD
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Description</label>
            <input
              className="ledger-input"
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What was this expense for?"
              required
            />
          </div>

          {/* Date */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Date</label>
            <input
              className="ledger-input"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Note */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Note <span style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>(optional)</span></label>
            <input
              className="ledger-input"
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Receipt reference, vendor, etc."
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(192, 68, 68, 0.12)',
              border: '1px solid rgba(192, 68, 68, 0.3)',
              color: 'var(--red)',
              padding: '8px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              letterSpacing: '0.04em',
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Log Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
