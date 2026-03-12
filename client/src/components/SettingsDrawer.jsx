import { useState, useEffect } from 'react';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

/* ── Cross-rate row: the primary "1 CNY = X PKR" display ─────────── */
function CrossRateRow({ cnyRate, pkrRate, pkrIsOverride, onSaveCrossRate }) {
  const cnyToPkr = pkrRate / cnyRate;
  const [editing, setEditing] = useState(false);
  const [input, setInput]     = useState(cnyToPkr.toFixed(2));

  // Keep input in sync if rates change from outside (e.g. reset)
  useEffect(() => {
    if (!editing) setInput((pkrRate / cnyRate).toFixed(2));
  }, [cnyRate, pkrRate, editing]);

  const handleSave = async () => {
    const val = parseFloat(input);
    if (!val || val <= 0) return;
    await onSaveCrossRate(val);
    setEditing(false);
  };

  const mono = { fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' };

  return (
    <div style={{
      padding: '16px 0',
      borderBottom: '1px solid var(--border-dim)',
    }}>
      {/* Rate label */}
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <div>
          <div style={{ ...mono, fontSize: '0.7rem', color: 'var(--text-primary)', fontWeight: 500 }}>
            ¥ CNY → ₨ PKR
          </div>
          <div style={{ ...mono, fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 2 }}>
            ¥1 Chinese Yuan =
            <span style={{ color: pkrIsOverride ? 'var(--gold)' : 'var(--green)', marginLeft: 4 }}>
              ₨{cnyToPkr.toFixed(3)} Pakistani Rupee
            </span>
          </div>
        </div>
        {pkrIsOverride ? (
          <span style={{
            ...mono, fontSize: '0.52rem', color: 'var(--gold)',
            background: 'var(--gold-dim)', border: '1px solid var(--border-gold)',
            padding: '2px 7px', borderRadius: 3,
          }}>CUSTOM</span>
        ) : (
          <span style={{
            ...mono, fontSize: '0.52rem', color: 'var(--green)',
            background: 'rgba(77,168,112,0.1)', border: '1px solid rgba(77,168,112,0.25)',
            padding: '2px 7px', borderRadius: 3,
          }}>LIVE</span>
        )}
      </div>

      {/* Edit row */}
      {editing ? (
        <div className="flex items-center gap-2">
          <span style={{ ...mono, fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>¥1 CNY =</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            autoFocus
            style={{
              flex: 1,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-gold-bright)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              padding: '7px 10px',
              outline: 'none',
              borderRadius: 4,
            }}
          />
          <span style={{ ...mono, fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>PKR</span>
          <button
            onClick={handleSave}
            style={{ padding: '6px 12px', background: 'var(--gold)', border: 'none', color: '#fff', fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', borderRadius: 4, flexShrink: 0 }}
          >
            Save
          </button>
          <button
            onClick={() => { setEditing(false); setInput(cnyToPkr.toFixed(2)); }}
            style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', cursor: 'pointer', borderRadius: 4, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-dim)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            letterSpacing: '0.08em',
            cursor: 'pointer',
            borderRadius: 4,
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-gold)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-dim)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <span>¥1 CNY = ₨{cnyToPkr.toFixed(2)} PKR</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
            <path d="M7 1L9 3L3 9H1V7L7 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Also show reverse for reference */}
      <div style={{ ...mono, fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 8 }}>
        ₨1 PKR = ¥{(1 / cnyToPkr).toFixed(5)} CNY
      </div>
    </div>
  );
}

/* ── USD reference row ─────────────────────────────────────────────── */
function UsdRefRow({ rec, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(rec.rate.toFixed(4));

  useEffect(() => {
    if (!editing) setValue(rec.rate.toFixed(4));
  }, [rec.rate, editing]);

  const handleSave = async () => {
    const parsed = parseFloat(value);
    if (!parsed || parsed <= 0) return;
    await onSave(rec.currency, parsed);
    setEditing(false);
  };

  const label = rec.currency === 'CNY' ? '¥ CNY' : '₨ PKR';
  const sym   = rec.currency === 'CNY' ? '¥' : '₨';
  const mono  = { fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-dim)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ ...mono, fontSize: '0.62rem', color: 'var(--text-secondary)' }}>{label}</div>
        <div style={{ ...mono, fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 1 }}>
          $1 USD = {sym}{rec.rate.toFixed(4)}
        </div>
      </div>

      {rec.is_override ? (
        <span style={{ ...mono, fontSize: '0.5rem', color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid var(--border-gold)', padding: '2px 6px', borderRadius: 3 }}>
          CUSTOM
        </span>
      ) : (
        <span style={{ ...mono, fontSize: '0.5rem', color: 'var(--green)', background: 'rgba(77,168,112,0.1)', border: '1px solid rgba(77,168,112,0.25)', padding: '2px 6px', borderRadius: 3 }}>
          LIVE
        </span>
      )}

      {editing ? (
        <div className="flex gap-1 items-center">
          <input
            type="number" step="0.0001" value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            autoFocus
            style={{ width: 70, background: 'var(--bg-elevated)', border: '1px solid var(--border-gold-bright)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', padding: '4px 7px', outline: 'none', borderRadius: 3 }}
          />
          <button onClick={handleSave} style={{ padding: '4px 8px', background: 'var(--gold)', border: 'none', color: '#fff', fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '0.65rem', cursor: 'pointer', borderRadius: 3 }}>OK</button>
          <button onClick={() => { setEditing(false); setValue(rec.rate.toFixed(4)); }} style={{ padding: '4px 6px', background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', cursor: 'pointer', borderRadius: 3 }}>✕</button>
        </div>
      ) : (
        rec.currency !== 'PKR' && (  // PKR is derived from the cross-rate; edit via cross-rate above
          <button
            onClick={() => setEditing(true)}
            style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.06em', cursor: 'pointer', borderRadius: 3 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-med)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-dim)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            Edit
          </button>
        )
      )}
    </div>
  );
}

/* ── Drawer ────────────────────────────────────────────────────────── */
export default function SettingsDrawer({ open, onClose, onRatesUpdated }) {
  const { setRates } = useCurrency();
  const [records, setRecords]   = useState([]);
  const [resetting, setResetting] = useState(false);
  const [status, setStatus]     = useState('');

  useEffect(() => {
    if (open) fetchRates();
  }, [open]);

  const fetchRates = async () => {
    const res  = await fetch('/api/rates');
    const data = await res.json();
    setRecords(data);
  };

  const syncContext = (newRecords) => {
    const map = {};
    newRecords.forEach(r => { map[r.currency] = r.rate; });
    setRates(map);
    onRatesUpdated(map);
  };

  // Save individual USD-based rate
  const handleSaveRate = async (currency, rate) => {
    const res     = await fetch(`/api/rates/${currency}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate }),
    });
    const updated = await res.json();
    const newRecords = records.map(r => r.currency === currency ? updated : r);
    setRecords(newRecords);
    syncContext(newRecords);
    setStatus('Rate saved.');
    setTimeout(() => setStatus(''), 2000);
  };

  // Save CNY→PKR cross-rate: derive new PKR/USD rate
  const handleSaveCrossRate = async (cnyToPkr) => {
    const cnyRate    = records.find(r => r.currency === 'CNY')?.rate || 7.24;
    const newPkrRate = cnyToPkr * cnyRate;
    await handleSaveRate('PKR', newPkrRate);
  };

  const handleReset = async () => {
    setResetting(true);
    setStatus('Fetching live rates…');
    const res  = await fetch('/api/rates/reset', { method: 'POST' });
    const data = await res.json();
    setRecords(data.rates);
    syncContext(data.rates);
    setResetting(false);
    setStatus(data.success ? 'Rates updated from live feed.' : 'Could not reach API — kept existing rates.');
    setTimeout(() => setStatus(''), 3000);
  };

  const cnyRec = records.find(r => r.currency === 'CNY');
  const pkrRec = records.find(r => r.currency === 'PKR');
  const usdRefRecs = records.filter(r => r.currency !== 'USD'); // CNY + PKR for USD ref section

  if (!open) return null;

  const mono = { fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', textTransform: 'uppercase' };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="settings-drawer">
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>
              Exchange Rates
            </h2>
            <p style={{ ...mono, fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 4 }}>
              CNY ↔ PKR · USD reference
            </p>
          </div>
          <button
            onClick={onClose}
            className="icon-btn"
            style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 6 }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>

          {/* Primary: CNY ↔ PKR */}
          <div style={{ ...mono, fontSize: '0.58rem', color: 'var(--text-muted)', paddingTop: 18, paddingBottom: 4 }}>
            Primary Rate
          </div>
          {cnyRec && pkrRec && (
            <CrossRateRow
              cnyRate={cnyRec.rate}
              pkrRate={pkrRec.rate}
              pkrIsOverride={pkrRec.is_override}
              onSaveCrossRate={handleSaveCrossRate}
            />
          )}

          {/* Reference: USD rates */}
          <div style={{ ...mono, fontSize: '0.58rem', color: 'var(--text-muted)', paddingTop: 18, paddingBottom: 4 }}>
            USD Reference <span style={{ opacity: 0.5 }}>· comparison only</span>
          </div>
          {usdRefRecs.map(rec => (
            <UsdRefRow key={rec.currency} rec={rec} onSave={handleSaveRate} />
          ))}

          <div style={{ padding: '14px 0 8px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.04em', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              All amounts are stored in USD internally. PKR is derived from the CNY/PKR cross-rate. Custom overrides persist across sessions.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px 20px', borderTop: '1px solid var(--border-dim)', flexShrink: 0 }}>
          {status && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.04em', color: 'var(--gold)', marginBottom: 10 }}>
              {status}
            </div>
          )}
          <button
            className="btn-ghost"
            onClick={handleReset}
            disabled={resetting}
            style={{ width: '100%', justifyContent: 'center', display: 'flex' }}
          >
            {resetting ? 'Fetching live rates…' : 'Reset to live rates'}
          </button>
        </div>
      </aside>
    </>
  );
}
