import { useCurrency } from '../contexts/CurrencyContext.jsx';

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function InsightCard({ eyebrow, title, tone = 'neutral', children, footer }) {
  const accents = {
    neutral: {
      border: 'var(--border-dim)',
      glow: 'rgba(212, 146, 42, 0.08)',
      title: 'var(--text-primary)',
    },
    danger: {
      border: 'rgba(224, 82, 82, 0.28)',
      glow: 'rgba(224, 82, 82, 0.08)',
      title: 'var(--red)',
    },
    positive: {
      border: 'rgba(62, 200, 122, 0.26)',
      glow: 'rgba(62, 200, 122, 0.08)',
      title: 'var(--green)',
    },
  };

  const accent = accents[tone];

  return (
    <article
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--bg-card)',
        border: `1px solid ${accent.border}`,
        borderRadius: 10,
        padding: '18px 18px 16px',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at top right, ${accent.glow} 0%, transparent 52%)`,
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
            letterSpacing: '0.16em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          {eyebrow}
        </div>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.2rem',
            lineHeight: 1.05,
            color: accent.title,
            marginBottom: 10,
          }}
        >
          {title}
        </h3>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.6 }}>
          {children}
        </div>
        {footer ? (
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid var(--border-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.64rem',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function DashboardInsights({ categories, expenses, masterBudgetPKR, onAddExpense }) {
  const { rates, fmtFixed } = useCurrency();
  const pkrRate = rates.PKR || 278.5;

  const totalAllocated = categories.reduce((sum, category) => sum + (category.budget_pkr ?? 0), 0);
  const unallocated = masterBudgetPKR - totalAllocated;
  const totalSpent = categories.reduce((sum, category) => sum + (category.spent_pkr ?? ((category.spent_usd ?? 0) * pkrRate)), 0);
  const remainingBudget = Math.max(0, masterBudgetPKR - totalSpent);

  const overBudget = categories
    .filter((category) => (category.spent_pkr ?? ((category.spent_usd ?? 0) * pkrRate)) > (category.budget_pkr ?? 0))
    .sort((left, right) => (
      (right.spent_pkr ?? ((right.spent_usd ?? 0) * pkrRate)) - (right.budget_pkr ?? 0)
    ) - (
      (left.spent_pkr ?? ((left.spent_usd ?? 0) * pkrRate)) - (left.budget_pkr ?? 0)
    ));

  const topSpendCategory = [...categories]
    .sort((left, right) => (
      (right.spent_pkr ?? ((right.spent_usd ?? 0) * pkrRate)) -
      (left.spent_pkr ?? ((left.spent_usd ?? 0) * pkrRate))
    ))[0];

  const recentWindow = daysAgo(6);
  const recentExpenses = expenses.filter((expense) => startOfDay(expense.date) >= recentWindow);
  const last7DaysSpent = recentExpenses.reduce((sum, expense) => sum + (expense.amount_usd * pkrRate), 0);
  const avgDailySpend = recentExpenses.length ? last7DaysSpent / 7 : 0;
  const runwayDays = avgDailySpend > 0 ? Math.floor(remainingBudget / avgDailySpend) : null;

  const latestExpenses = [...expenses]
    .sort((left, right) => `${right.date} ${right.created_at || ''}`.localeCompare(`${left.date} ${left.created_at || ''}`))
    .slice(0, 4);

  const inventoryCategory = categories.find((category) => category.name.toLowerCase() === 'inventory');
  const inventoryCoverage = inventoryCategory?.budget_pkr
    ? Math.max(0, inventoryCategory.budget_pkr - (inventoryCategory.spent_pkr ?? ((inventoryCategory.spent_usd ?? 0) * pkrRate)))
    : 0;

  return (
    <section style={{ paddingTop: 24, animation: 'fadeSlideUp 0.5s 0.18s both' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 16,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.55rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            Decision Board
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.64rem',
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              marginTop: 4,
            }}
          >
            PRIORITIES, EXCEPTIONS, AND RECENT MOVEMENT
          </p>
        </div>

        <button type="button" className="btn-ghost" onClick={() => onAddExpense?.()}>
          Log Recent Spend
        </button>
      </div>

      <div className="insights-grid">
        <InsightCard
          eyebrow="Budget signal"
          title={
            overBudget.length
              ? `${overBudget[0].name} is over plan`
              : 'No category is over budget'
          }
          tone={overBudget.length ? 'danger' : 'positive'}
          footer={
            overBudget.length
              ? `${overBudget.length} categor${overBudget.length > 1 ? 'ies' : 'y'} above budget`
              : `Unallocated pool: ${fmtFixed(Math.max(unallocated, 0), 'PKR')}`
          }
        >
          {overBudget.length ? (
            <>
              Overspend is currently {fmtFixed(
                (overBudget[0].spent_pkr ?? ((overBudget[0].spent_usd ?? 0) * pkrRate)) - (overBudget[0].budget_pkr ?? 0),
                'PKR'
              )} above its cap.
              {overBudget[1] ? ` ${overBudget[1].name} is the next category to review.` : ''}
            </>
          ) : (
            <>
              Current allocation still has {fmtFixed(Math.max(unallocated, 0), 'PKR')} available at the top level.
              {unallocated < 0 ? ` Categories are over-allocated by ${fmtFixed(Math.abs(unallocated), 'PKR')}.` : ''}
            </>
          )}
        </InsightCard>

        <InsightCard
          eyebrow="Spend velocity"
          title={
            runwayDays !== null
              ? `${runwayDays} days of runway at current pace`
              : last7DaysSpent > 0
                ? `${fmtFixed(last7DaysSpent, 'PKR')} spent in 7 days`
                : 'No spending in the last 7 days'
          }
          tone={last7DaysSpent > 0 ? 'neutral' : 'positive'}
          footer={
            topSpendCategory
              ? `${topSpendCategory.name} has the largest total draw at ${fmtFixed(topSpendCategory.spent_pkr ?? ((topSpendCategory.spent_usd ?? 0) * pkrRate), 'PKR')}`
              : 'No category data available'
          }
        >
          {topSpendCategory ? (
            <>
              The strongest draw on the budget is <strong>{topSpendCategory.name}</strong>.
              {avgDailySpend > 0 ? ` Average recent spend is ${fmtFixed(avgDailySpend, 'PKR')} per day.` : ''}
              {inventoryCategory
                ? ` Inventory headroom is ${fmtFixed(inventoryCoverage, 'PKR')} before that category reaches its current budget.`
                : ''}
            </>
          ) : (
            'Start logging categories or expenses to generate velocity insights.'
          )}
        </InsightCard>

        <InsightCard
          eyebrow="Recent ledger"
          title={latestExpenses.length ? latestExpenses[0].description : 'No recent expenses logged'}
          footer={latestExpenses.length ? `Latest entry on ${latestExpenses[0].date}` : 'Use the expense flow or AI chat to add activity'}
        >
          {latestExpenses.length ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {latestExpenses.map((expense) => (
                <div
                  key={expense.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    paddingBottom: 10,
                    borderBottom: '1px solid var(--border-dim)',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '0.82rem' }}>{expense.description}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.08em', color: 'var(--text-muted)', marginTop: 3 }}>
                      {expense.category_name} · {expense.date}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-primary)' }}>
                    {fmtFixed(expense.amount_usd * pkrRate, 'PKR')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            'Recent activity will appear here once the ledger has data.'
          )}
        </InsightCard>
      </div>
    </section>
  );
}
