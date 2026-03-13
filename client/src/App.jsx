import { useState, useEffect, useCallback } from 'react';
import { CurrencyProvider, useCurrency } from './contexts/CurrencyContext.jsx';
import Navigation from './components/Navigation.jsx';
import KPICards from './components/KPICards.jsx';
import CategorySection from './components/CategorySection.jsx';
import Charts from './components/Charts.jsx';
import DashboardInsights from './components/DashboardInsights.jsx';
import ExpenseModal from './components/ExpenseModal.jsx';
import SettingsDrawer from './components/SettingsDrawer.jsx';
import ProfitCalculator from './components/ProfitCalculator.jsx';
import ChatBox from './components/ChatBox.jsx';

function Dashboard({ theme, toggleTheme, accent, setAccent, bg, setBg }) {
  const { setRates } = useCurrency();

  const [categories, setCategories]       = useState([]);
  const [expenses, setExpenses]           = useState([]);
  const [dailyData, setDailyData]         = useState([]);
  const [masterBudgetPKR, setMasterBudget] = useState(0);
  const [loading, setLoading]             = useState(true);

  const [settingsOpen, setSettingsOpen]         = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'profit'
  const [inventoryRefreshToken, setInventoryRefreshToken] = useState(0);

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/categories');
    setCategories(await res.json());
  }, []);

  const fetchExpenses = useCallback(async () => {
    const res = await fetch('/api/expenses');
    setExpenses(await res.json());
  }, []);

  const fetchDailyData = useCallback(async () => {
    const res = await fetch('/api/expenses/daily');
    setDailyData(await res.json());
  }, []);

  const fetchMasterBudget = useCallback(async () => {
    const res = await fetch('/api/settings/total_budget');
    const { value_pkr } = await res.json();
    setMasterBudget(value_pkr || 0);
  }, []);

  const initRates = useCallback(async () => {
    try {
      const res  = await fetch('/api/rates');
      const data = await res.json();
      const map  = {};
      data.forEach(r => { map[r.currency] = r.rate; });
      setRates(map);
    } catch { /* use defaults */ }

    try {
      const res  = await fetch('/api/rates/fetch', { method: 'POST' });
      const data = await res.json();
      if (data.rates?.length) {
        const map = {};
        data.rates.forEach(r => { map[r.currency] = r.rate; });
        setRates(map);
      }
    } catch { /* stay with cached */ }
  }, [setRates]);

  useEffect(() => {
    Promise.all([
      fetchCategories(),
      fetchExpenses(),
      fetchDailyData(),
      fetchMasterBudget(),
      initRates(),
    ]).finally(() => setLoading(false));
  }, []);

  const refreshAll = useCallback(() => {
    fetchCategories();
    fetchExpenses();
    fetchDailyData();
    fetchMasterBudget();
    setInventoryRefreshToken(prev => prev + 1);
  }, [fetchCategories, fetchExpenses, fetchDailyData, fetchMasterBudget]);

  const handleExpenseAdded = useCallback(() => {
    setExpenseModalOpen(false);
    setSelectedCategory(null);
    refreshAll();
  }, [refreshAll]);

  const openExpenseModal = useCallback((cat = null) => {
    setSelectedCategory(cat);
    setExpenseModalOpen(true);
  }, []);

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div className="bg-mesh" />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navigation
          onSettingsOpen={() => setSettingsOpen(true)}
          onAddExpense={() => openExpenseModal()}
          theme={theme}
          onToggleTheme={toggleTheme}
          accent={accent}
          onAccentChange={setAccent}
          bg={bg}
          onBgChange={setBg}
        />

        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'calc(100vh - 60px)',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              letterSpacing: '0.18em',
              color: 'var(--text-muted)',
            }}>
              Loading…
            </div>
          </div>
        ) : (
          <main className="dashboard-main" style={{ maxWidth: 1440, margin: '0 auto' }}>
            {/* View tab bar */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-dim)', marginTop: 8, marginBottom: 0 }}>
              {[
                { id: 'dashboard', label: 'Budget Planner' },
                { id: 'profit',    label: 'Profit Calculator' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: view === tab.id ? '2px solid var(--gold)' : '2px solid transparent',
                    color: view === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '0.8rem',
                    fontWeight: view === tab.id ? 600 : 400,
                    letterSpacing: '0.01em',
                    padding: '14px 22px 12px',
                    cursor: 'pointer',
                    marginBottom: -1,
                    transition: 'color 0.15s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {view === 'dashboard' && (
              <>
                <KPICards
                  categories={categories}
                  masterBudgetPKR={masterBudgetPKR}
                  onUpdated={refreshAll}
                />

                <DashboardInsights
                  categories={categories}
                  expenses={expenses}
                  masterBudgetPKR={masterBudgetPKR}
                  onAddExpense={() => openExpenseModal()}
                />

                <div style={{
                  margin: '24px 0',
                  height: 1,
                  background: 'linear-gradient(to right, var(--border-gold) 0%, var(--border-dim) 60%, transparent 100%)',
                }} />

                <div className="dashboard-grid" style={{ alignItems: 'start' }}>
                  <CategorySection
                    categories={categories}
                    expenses={expenses}
                    onAddExpense={openExpenseModal}
                    onCategoryUpdated={refreshAll}
                    inventoryRefreshToken={inventoryRefreshToken}
                  />
                  <Charts
                    categories={categories}
                    expenses={expenses}
                    dailyData={dailyData}
                  />
                </div>
              </>
            )}

            {view === 'profit' && (
              <div style={{ paddingTop: 28 }}>
                <ProfitCalculator categories={categories} />
              </div>
            )}
          </main>
        )}
      </div>

      {expenseModalOpen && (
        <ExpenseModal
          categories={categories}
          selectedCategory={selectedCategory}
          onClose={() => { setExpenseModalOpen(false); setSelectedCategory(null); }}
          onAdded={handleExpenseAdded}
        />
      )}

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onRatesUpdated={(map) => setRates(map)}
      />

      <ChatBox onDataChanged={refreshAll} activeView={view} />
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('soleris-theme') || 'dark';
  });

  const [accent, setAccentState] = useState(() => {
    return localStorage.getItem('soleris-accent') || 'gold';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('soleris-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
    localStorage.setItem('soleris-accent', accent);
  }, [accent]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }, []);

  const setAccent = useCallback((a) => {
    setAccentState(a);
  }, []);

  const [bg, setBgState] = useState(() => {
    return localStorage.getItem('soleris-bg') || 'warm';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-bg', bg);
    localStorage.setItem('soleris-bg', bg);
  }, [bg]);

  const setBg = useCallback((b) => {
    setBgState(b);
  }, []);

  return (
    <CurrencyProvider>
      <Dashboard theme={theme} toggleTheme={toggleTheme} accent={accent} setAccent={setAccent} bg={bg} setBg={setBg} />
    </CurrencyProvider>
  );
}
