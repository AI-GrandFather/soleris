import { createContext, useContext, useState, useCallback, useRef } from 'react';

const CurrencyContext = createContext(null);

const SYMBOLS = { USD: '$', CNY: '¥', PKR: '₨' };
const LABELS  = { USD: 'USD', CNY: 'CNY', PKR: 'PKR' };

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState('USD');
  const [rates, setRates] = useState({ USD: 1.0, CNY: 7.24, PKR: 278.5 });
  const [switching, setSwitching] = useState(false);
  const timerRef = useRef(null);

  const switchCurrency = useCallback((next) => {
    if (next === currency) return;
    setSwitching(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCurrency(next);
      setSwitching(false);
    }, 180);
  }, [currency]);

  const convert = useCallback((usd) => {
    return (usd ?? 0) * (rates[currency] ?? 1);
  }, [currency, rates]);

  // Accepts a raw USD amount, returns formatted string in current currency
  // Always shows the full figure with commas — no abbreviations
  const fmt = useCallback((usd) => {
    const val = convert(usd);
    const sym = SYMBOLS[currency];
    const rounded = Math.round(val);
    return `${sym}${rounded.toLocaleString('en-US')}`;
  }, [convert, currency]);

  return (
    <CurrencyContext.Provider value={{
      currency, rates, setRates,
      switchCurrency, switching,
      convert, fmt,
      symbol: SYMBOLS[currency],
      SYMBOLS, LABELS,
    }}>
      <div className={switching ? 'currency-switching' : ''} style={{ display: 'contents' }}>
        {children}
      </div>
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
