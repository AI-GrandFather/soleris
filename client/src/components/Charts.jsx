import {
  PieChart, Pie, Cell, Tooltip as RechartTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

// Builds last N days array with cumulative spend
function buildCumulativeData(dailyRaw, days = 30) {
  const map = {};
  dailyRaw.forEach(d => { map[d.date] = d.total_usd; });

  let cumulative = 0;
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    cumulative += map[dateStr] || 0;
    result.push({
      date: dateStr,
      label: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(d),
      cumulative,
    });
  }
  return result;
}

function ChartTitle({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '0.65rem',
      letterSpacing: '0.18em',
      color: 'var(--text-secondary)',
      textTransform: 'uppercase',
      marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

function DarkTooltip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-gold)',
      padding: '8px 12px',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.7rem',
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4, letterSpacing: '0.04em' }}>
        {label}
      </div>
      {payload.map((entry, i) => (
        <div key={i} style={{ color: entry.color || 'var(--gold)', letterSpacing: '0.04em' }}>
          {entry.name}: <span style={{ color: 'var(--text-primary)' }}>{fmt ? fmt(entry.value) : entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ categories, convert, fmt }) {
  const data = categories.map(c => ({
    name: c.name,
    value: convert(c.budget_usd),
    valueRaw: c.budget_usd,
    color: c.color,
  }));

  const totalBudget = categories.reduce((s, c) => s + c.budget_usd, 0);

  const CustomLabel = ({ cx, cy }) => (
    <>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-muted)" style={{ fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: 2 }}>BUDGET</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-primary)" style={{ fontFamily: 'DM Sans', fontSize: 18, fontWeight: 600 }}>
        {fmt(totalBudget)}
      </text>
    </>
  );

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 8, padding: '20px 20px 16px', boxShadow: 'var(--shadow-card)' }}>
      <ChartTitle>Allocation by Category</ChartTitle>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={82}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={CustomLabel}
            isAnimationActive
            animationBegin={100}
            animationDuration={700}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="var(--bg-base)" strokeWidth={2} />
            ))}
          </Pie>
          <RechartTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-gold)', padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', letterSpacing: '0.04em' }}>{fmt(d.valueRaw)}</div>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1" style={{ marginTop: 8 }}>
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
              {d.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpentVsRemainingChart({ categories, convert, fmt }) {
  const data = categories.map(c => ({
    name: c.name.length > 10 ? c.name.slice(0, 10) + '…' : c.name,
    spent: parseFloat(convert(c.spent_usd).toFixed(2)),
    remaining: parseFloat(convert(Math.max(0, c.budget_usd - c.spent_usd)).toFixed(2)),
    spentRaw: c.spent_usd,
    remainingRaw: Math.max(0, c.budget_usd - c.spent_usd),
  }));

  const tick = { fontFamily: 'JetBrains Mono', fontSize: 10, fill: 'var(--text-secondary)', letterSpacing: 1 };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 8, padding: '20px 20px 16px', boxShadow: 'var(--shadow-card)' }}>
      <ChartTitle>Spent vs. Remaining</ChartTitle>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barGap={2} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--border-dim)" />
          <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} />
          <YAxis hide />
          <RechartTooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-gold)', padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
                  {payload.map((p, i) => (
                    <div key={i} style={{ color: p.fill === 'var(--gold)' ? 'var(--gold)' : 'var(--text-secondary)', marginBottom: 2 }}>
                      {p.name}: <span style={{ color: 'var(--text-primary)' }}>{fmt(p.payload[p.name + 'Raw'])}</span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <Bar dataKey="spent" name="spent" fill="var(--gold)" radius={[2, 2, 0, 0]} isAnimationActive animationBegin={150} animationDuration={600} />
          <Bar dataKey="remaining" name="remaining" fill="var(--bg-elevated)" radius={[2, 2, 0, 0]} stroke="var(--border-med)" strokeWidth={1} isAnimationActive animationBegin={250} animationDuration={600} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4" style={{ marginTop: 8 }}>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 10, height: 3, background: 'var(--gold)', display: 'inline-block' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>SPENT</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 10, height: 3, background: 'var(--bg-elevated)', border: '1px solid var(--border-med)', display: 'inline-block' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>REMAINING</span>
        </div>
      </div>
    </div>
  );
}

function CumulativeLine({ dailyData, convert, fmt }) {
  const data = buildCumulativeData(dailyData, 30);
  const converted = data.map(d => ({ ...d, cumulative: parseFloat(convert(d.cumulative).toFixed(2)) }));
  const hasData = converted.some(d => d.cumulative > 0);

  const tick = { fontFamily: 'JetBrains Mono', fontSize: 9, fill: 'var(--text-secondary)', letterSpacing: 1 };
  // Show every 5th label
  const labelInterval = 4;

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 8, padding: '20px 20px 16px', boxShadow: 'var(--shadow-card)' }}>
      <ChartTitle>Cumulative Spend — Last 30 Days</ChartTitle>

      {!hasData ? (
        <div style={{
          height: 160,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          letterSpacing: '0.12em',
          color: 'var(--text-muted)',
        }}>
          NO EXPENSE DATA YET
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={converted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="goldFade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--gold)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border-dim)" />
            <XAxis
              dataKey="label"
              tick={tick}
              axisLine={false}
              tickLine={false}
              interval={labelInterval}
            />
            <YAxis hide />
            <RechartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const raw = dailyData.find(d => {
                  const dObj = new Date(payload[0].payload.date);
                  return d.date === payload[0].payload.date;
                });
                return (
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-gold)', padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
                    <div style={{ color: 'var(--gold)' }}>
                      Cumulative: <span style={{ color: 'var(--text-primary)' }}>{fmt(payload[0].payload.cumulative / (1))}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="var(--gold)"
              strokeWidth={1.5}
              fill="url(#goldFade)"
              dot={false}
              activeDot={{ r: 3, fill: 'var(--gold)', strokeWidth: 0 }}
              isAnimationActive
              animationBegin={200}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function Charts({ categories, expenses, dailyData }) {
  const { convert, fmt } = useCurrency();

  return (
    <section
      className="flex flex-col gap-4"
      style={{ animation: 'fadeSlideUp 0.5s 0.3s both' }}
    >
      <DonutChart categories={categories} convert={convert} fmt={fmt} />
      <SpentVsRemainingChart categories={categories} convert={convert} fmt={fmt} />
      <CumulativeLine dailyData={dailyData} convert={convert} fmt={fmt} />
    </section>
  );
}
