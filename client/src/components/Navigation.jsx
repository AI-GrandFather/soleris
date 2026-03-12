import { useCurrency } from '../contexts/CurrencyContext.jsx';

function SunIcon() {
  return (
    <svg className="theme-icon" key="sun" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.22 3.22l1.06 1.06M11.72 11.72l1.06 1.06M3.22 12.78l1.06-1.06M11.72 4.28l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="theme-icon" key="moon" width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M13 9.5A6 6 0 0 1 5.5 2 6.5 6.5 0 1 0 13 9.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}

export default function Navigation({ onSettingsOpen, onAddExpense, theme, onToggleTheme }) {
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
        className="flex items-center justify-between px-6"
        style={{ maxWidth: 1440, margin: '0 auto', height: 60 }}
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
        <div className="flex items-center gap-2">
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

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={iconBtnStyle}
            {...iconBtnHover}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Exchange rate settings */}
          <button
            onClick={onSettingsOpen}
            title="Exchange rate settings"
            style={iconBtnStyle}
            {...iconBtnHover}
          >
            {/* Currency exchange icon — clearly distinct from sun/moon */}
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
