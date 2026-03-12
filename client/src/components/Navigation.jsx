import { useState, useEffect, useRef } from 'react';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

const ACCENTS = [
  { id: 'gold',  label: 'Gold',  dark: '#D4922A', light: '#9A6808' },
  { id: 'ocean', label: 'Ocean', dark: '#2898C8', light: '#0F6B95' },
  { id: 'sage',  label: 'Sage',  dark: '#4A9A6A', light: '#2A6B44' },
  { id: 'rose',  label: 'Rose',  dark: '#C8607A', light: '#9A3050' },
  { id: 'slate', label: 'Slate', dark: '#6A7EC8', light: '#3A4E9A' },
];

const BG_OPTIONS = [
  { id: 'warm',     label: 'Warm',      color: '#F3EFE6' },
  { id: 'offwhite', label: 'Off-White', color: '#F8F8F8' },
  { id: 'white',    label: 'White',     color: '#FFFFFF' },
  { id: 'cool',     label: 'Cool',      color: '#F0F2F5' },
];

function SunIcon() {
  return (
    <svg className="theme-icon" key="sun" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.22 3.22l1.06 1.06M11.72 11.72l1.06 1.06M3.22 12.78l1.06-1.06M11.72 4.28l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="theme-icon" key="moon" width="13" height="13" viewBox="0 0 15 15" fill="none">
      <path d="M13 9.5A6 6 0 0 1 5.5 2 6.5 6.5 0 1 0 13 9.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}

function ThemePicker({ theme, onToggleTheme, accent, onAccentChange, bg, onBgChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const currentAccent = ACCENTS.find(a => a.id === accent) || ACCENTS[0];
  const accentColor = theme === 'dark' ? currentAccent.dark : currentAccent.light;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Appearance"
        style={{
          height: 36,
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          background: open ? 'var(--gold-dim)' : 'transparent',
          border: '1px solid ' + (open ? 'var(--border-gold)' : 'var(--border-dim)'),
          color: open ? 'var(--gold)' : 'var(--text-secondary)',
          cursor: 'pointer',
          borderRadius: 6,
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          if (!open) {
            e.currentTarget.style.color = 'var(--gold)';
            e.currentTarget.style.borderColor = 'var(--border-gold)';
            e.currentTarget.style.background = 'var(--gold-dim)';
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'var(--border-dim)';
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <span style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: accentColor,
          flexShrink: 0,
          boxShadow: `0 0 0 2px ${accentColor}22`,
        }} />
        {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-med)',
          borderTop: '2px solid var(--gold)',
          borderRadius: 8,
          boxShadow: 'var(--shadow-modal)',
          padding: '14px 16px 16px',
          width: 200,
          zIndex: 200,
          animation: 'fadeSlideDown 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.58rem',
            letterSpacing: '0.18em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Appearance
          </div>

          {/* Accent swatches */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {ACCENTS.map(a => {
              const color = theme === 'dark' ? a.dark : a.light;
              const selected = accent === a.id;
              return (
                <button
                  key={a.id}
                  title={a.label}
                  onClick={() => onAccentChange(a.id)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: color,
                    border: selected ? `2px solid var(--text-primary)` : '2px solid transparent',
                    outline: selected ? `2px solid ${color}` : 'none',
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

          {/* Mode toggle */}
          <div style={{
            display: 'flex',
            border: '1px solid var(--border-med)',
            borderRadius: 6,
            overflow: 'hidden',
          }}>
            {[{ id: 'dark', label: 'Dark' }, { id: 'light', label: 'Light' }].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => { if (theme !== id) onToggleTheme(); }}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.08em',
                  background: theme === id ? 'var(--gold-dim)' : 'transparent',
                  color: theme === id ? 'var(--gold)' : 'var(--text-secondary)',
                  border: 'none',
                  borderRight: id === 'dark' ? '1px solid var(--border-dim)' : 'none',
                  cursor: 'pointer',
                  fontWeight: theme === id ? 600 : 400,
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
              >
                {label}
              </button>
            ))}
          </div>

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
        </div>
      )}
    </div>
  );
}

export default function Navigation({ onSettingsOpen, onAddExpense, theme, onToggleTheme, accent, onAccentChange, bg, onBgChange }) {
  const { currency, switchCurrency, LABELS } = useCurrency();

  const iconBtnStyle = {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    borderRadius: 6,
    flexShrink: 0,
  };

  const iconBtnHover = {
    onMouseEnter: e => {
      e.currentTarget.style.color = 'var(--gold)';
      e.currentTarget.style.borderColor = 'var(--border-gold)';
      e.currentTarget.style.background = 'var(--gold-dim)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.color = 'var(--text-secondary)';
      e.currentTarget.style.borderColor = 'var(--border-dim)';
      e.currentTarget.style.background = 'transparent';
    },
  };

  return (
    <header style={{
      borderBottom: '1px solid var(--border-dim)',
      background: 'var(--bg-surface)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div
        className="nav-shell"
        style={{ maxWidth: 1440, margin: '0 auto' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div style={{
            width: 30,
            height: 30,
            borderRadius: 6,
            border: '1px solid var(--border-gold)',
            background: 'var(--gold-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2.5h10M2 7h10M2 11.5h6" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.2rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '0.01em',
              lineHeight: 1,
            }}>
              Soleris
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.58rem',
              letterSpacing: '0.2em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}>
              Ledger
            </span>
          </div>
        </div>

        {/* Right controls */}
        <div className="nav-controls">
          {/* Currency toggle */}
          <div className="flex" style={{
            border: '1px solid var(--border-med)',
            borderRadius: 6,
            overflow: 'hidden',
          }}>
            {Object.keys(LABELS).map((cur, i, arr) => (
              <button
                key={cur}
                onClick={() => switchCurrency(cur)}
                style={{
                  padding: '6px 13px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  letterSpacing: '0.08em',
                  fontWeight: currency === cur ? 500 : 400,
                  background: currency === cur ? 'var(--gold-dim)' : 'transparent',
                  color: currency === cur ? 'var(--gold)' : 'var(--text-secondary)',
                  border: 'none',
                  borderRight: i < arr.length - 1 ? '1px solid var(--border-dim)' : 'none',
                  cursor: 'pointer',
                }}
              >
                {cur}
              </button>
            ))}
          </div>

          {/* Theme picker */}
          <ThemePicker
            theme={theme}
            onToggleTheme={onToggleTheme}
            accent={accent}
            onAccentChange={onAccentChange}
            bg={bg}
            onBgChange={onBgChange}
          />

          {/* Exchange rate settings */}
          <button
            onClick={onSettingsOpen}
            title="Exchange rate settings"
            style={iconBtnStyle}
            {...iconBtnHover}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 5h9.5M8.5 2.5L12 5l-3.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 11H4.5M7.5 8.5L4 11l3.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Add Expense */}
          <button
            onClick={onAddExpense}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            + Log Expense
          </button>
        </div>
      </div>
    </header>
  );
}
