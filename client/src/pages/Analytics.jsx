import { createElement, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarRange, Download, Minus } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.jsx';
import { inputClass } from '../components/ui/FormField.jsx';
import { IncomeExpenseChart } from '../components/charts/IncomeExpenseChart.jsx';
import { SpendingHeatmap } from '../components/charts/SpendingHeatmap.jsx';
import { CashFlowChart } from '../components/charts/CashFlowChart.jsx';
import { ChartTooltip } from '../components/charts/ChartTooltip.jsx';
import { categoryIcon } from '../components/transactions/categoryStyles.js';
import { useAsync } from '../hooks/useAsync.js';
import { useMoney } from '../hooks/useMoney.js';
import { useChartColors } from '../hooks/useChartColors.js';
import { useToast } from '../context/toast.js';
import { analyticsService } from '../services/financeServices.js';
import { formatDate, formatShortDate, todayInputValue } from '../utils/format.js';
import { cn } from '../utils/cn.js';

const RANGES = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '6m', label: '6M' },
  { value: '12m', label: '12M' },
  { value: 'ytd', label: 'YTD' },
  { value: 'custom', label: 'Custom' },
];

const GRANULARITIES = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
];

const bucketFormatters = {
  day: new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
  week: new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
  month: new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
  year: new Intl.DateTimeFormat('en-IN', { year: 'numeric', timeZone: 'UTC' }),
};

export default function Analytics() {
  const toast = useToast();
  const money = useMoney();
  const [range, setRange] = useState('30d');
  const [granularity, setGranularity] = useState(null);
  const [custom, setCustom] = useState({ from: '', to: todayInputValue() });
  const [downloading, setDownloading] = useState(false);

  const customReady = range !== 'custom' || (custom.from && custom.to && custom.from <= custom.to);
  const params = useMemo(
    () => ({ range, granularity: granularity ?? undefined, ...(range === 'custom' ? custom : {}) }),
    [range, granularity, custom],
  );

  const overview = useAsync(() => (customReady ? analyticsService.overview(params) : Promise.resolve(null)), [params, customReady]);
  const heatmap = useAsync(() => analyticsService.heatmap(365), []);
  const unusual = useAsync(() => analyticsService.unusual(90), []);
  const cashflow = useAsync(() => analyticsService.cashflow(6), []);

  async function downloadReport() {
    setDownloading(true);
    try {
      await analyticsService.downloadReport(params);
      toast.success('Report downloaded');
    } catch (error) {
      toast.error('Could not create report', error.message);
    } finally {
      setDownloading(false);
    }
  }

  const data = overview.data;
  const unit = data?.range.granularity ?? 'day';
  const formatBucket = (key) => bucketFormatters[unit].format(new Date(`${key}T00:00:00.000Z`)) + (unit === 'week' ? ' wk' : '');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label="Date range"
            value={range}
            onChange={(value) => {
              setRange(value);
              setGranularity(null);
            }}
            options={RANGES}
            size="sm"
          />
          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="from">From</label>
              <input id="from" type="date" value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className={cn(inputClass, 'h-9 w-auto border-border')} />
              <span className="text-muted">–</span>
              <label className="sr-only" htmlFor="to">To</label>
              <input id="to" type="date" value={custom.to} min={custom.from || undefined} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className={cn(inputClass, 'h-9 w-auto border-border')} />
            </div>
          )}
        </div>
        <Button variant="secondary" className="self-start xl:self-auto" onClick={downloadReport} loading={downloading} disabled={!data}>
          {!downloading && <Download className="size-4" aria-hidden="true" />}
          Download CSV report
        </Button>
      </div>

      {!customReady ? (
        <Card>
          <EmptyState icon={CalendarRange} title="Choose a date range" description="Pick a start and end date for your custom report." />
        </Card>
      ) : overview.error ? (
        <Card>
          <ErrorState title="Could not load analytics" error={overview.error} onRetry={overview.reload} />
        </Card>
      ) : !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">
            {formatDate(data.range.from)} – {formatDate(data.range.to)} · compared with {formatDate(data.previous.from)} – {formatDate(data.previous.to)}
          </p>

          <section aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <ChangeTile label="Income" value={data.totals.income} change={data.change.income} goodWhenUp />
            <ChangeTile label="Expenses" value={data.totals.expense} change={data.change.expense} />
            <ChangeTile label="Net saved" value={data.totals.net} amountChange={data.change.netAmount} hasPrevious={data.previous.transactionCount > 0} goodWhenUp />
            <Card className="p-4">
              <p className="text-xs font-medium text-muted sm:text-sm">Savings rate</p>
              <p className="tabular mt-1.5 text-xl font-bold sm:text-2xl">{data.totals.savingsRate === null ? '—' : `${data.totals.savingsRate}%`}</p>
              <p className="mt-0.5 text-xs text-muted">Avg spend {money(data.totals.avgDailySpend, { decimals: 0 })}/day</p>
            </Card>
          </section>

          <Card>
            <CardHeader
              title="Income vs expenses"
              description={`${data.totals.transactionCount} transactions`}
              action={
                <SegmentedControl
                  size="sm"
                  label="Group by"
                  value={unit}
                  onChange={setGranularity}
                  options={GRANULARITIES.filter((g) => allowedGranularity(g.value, data.range.days))}
                />
              }
            />
            {data.totals.transactionCount === 0 ? (
              <EmptyState icon={CalendarRange} title="No transactions in this period" className="py-8" />
            ) : (
              <IncomeExpenseChart data={data.series} xKey="bucket" formatLabel={formatBucket} height={280} />
            )}
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr] [&>*]:min-w-0">
            <CategoryBreakdown categories={data.categories} hasPrevious={data.previous.transactionCount > 0} />
            <div className="space-y-6">
              <WeekdayChart weekdays={data.weekdays} />
              <PaymentMethods methods={data.paymentMethods} />
            </div>
          </div>

          {data.topMerchants.length > 0 && <TopMerchants merchants={data.topMerchants} />}
        </>
      )}

      <Card>
        <CardHeader title="Spending heatmap" description="Daily spending over the last 12 months" />
        {heatmap.error ? (
          <ErrorState error={heatmap.error} onRetry={heatmap.reload} />
        ) : !heatmap.data ? (
          <Skeleton className="h-40" />
        ) : (
          <SpendingHeatmap data={heatmap.data} />
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <UnusualList state={unusual} />
        <Card>
          <CardHeader title="Cash-flow projection" description="Next 6 months if income and spending stay typical" />
          {cashflow.error ? (
            <ErrorState error={cashflow.error} onRetry={cashflow.reload} />
          ) : !cashflow.data ? (
            <Skeleton className="h-56" />
          ) : !cashflow.data.enoughData ? (
            <EmptyState icon={CalendarRange} title="Not enough history yet" description="Record at least one month of income and spending to see a projection." className="py-8" />
          ) : (
            <>
              <CashFlowChart months={cashflow.data.months} />
              <p className="mt-3 text-xs text-muted">
                Income: {cashflow.data.basis.income === 'income_sources' ? 'expected from your income sources' : 'average of recent months'}. Spending: typical (median) month
                of the last 3. Starting from your tracked balance.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function allowedGranularity(unit, days) {
  const buckets = { day: days, week: days / 7, month: days / 28, year: days / 365 }[unit];
  return buckets <= 400 && buckets >= 1;
}

/**
 * KPI with its change vs the previous period: a percentage (`change`) or, for
 * values that can be negative like net savings, an amount (`amountChange`).
 */
function ChangeTile({ label, value, change = null, amountChange, hasPrevious = true, goodWhenUp = false }) {
  const money = useMoney();
  const delta = amountChange ?? change;
  const known = amountChange !== undefined ? hasPrevious : change !== null;
  const up = delta > 0;
  const good = !known || delta === 0 ? null : goodWhenUp ? up : !up;
  const Icon = delta === 0 ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted sm:text-sm">{label}</p>
      <p className="tabular mt-1.5 truncate text-xl font-bold sm:text-2xl">{money(value, { decimals: 0 })}</p>
      <p className={cn('mt-0.5 flex items-center gap-1 text-xs font-medium', good === null ? 'text-muted' : good ? 'text-success' : 'text-danger')}>
        {!known ? (
          'No earlier data'
        ) : (
          <>
            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
            {amountChange !== undefined
              ? `${money(Math.abs(amountChange), { decimals: 0 })} ${up ? 'more' : delta < 0 ? 'less' : 'change'} than before`
              : `${Math.abs(change)}% vs previous period`}
          </>
        )}
      </p>
    </Card>
  );
}

function CategoryBreakdown({ categories, hasPrevious }) {
  const money = useMoney();
  const max = Math.max(1, ...categories.map((c) => c.total));
  return (
    <Card>
      <CardHeader title="Where the money went" description="Expenses by category, with change vs the previous period" />
      {categories.length === 0 ? (
        <p className="text-sm text-muted">No expenses in this period.</p>
      ) : (
        <ul className="space-y-3.5">
          {categories.map((c) => (
            <li key={c.category} className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                {createElement(categoryIcon(c.category, 'expense'), { className: 'size-4', 'aria-hidden': true })}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{c.category}</span>
                  <span className="tabular shrink-0 font-semibold">{money(c.total, { decimals: 0 })}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                  <div className="h-full rounded-full" style={{ width: `${(c.total / max) * 100}%`, background: 'var(--series-1)' }} />
                </div>
                <p className="mt-1 flex justify-between gap-2 text-xs text-muted">
                  <span>
                    {c.share}% of spending · {c.count} {c.count === 1 ? 'expense' : 'expenses'}
                  </span>
                  {c.change !== null && (
                    <span className={cn('font-medium', c.change > 0 ? 'text-danger' : 'text-success')}>
                      {c.change > 0 ? '▲' : '▼'} {Math.abs(c.change)}%
                    </span>
                  )}
                  {c.change === null && hasPrevious && <span>new this period</span>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function WeekdayChart({ weekdays }) {
  const colors = useChartColors();
  const money = useMoney();
  return (
    <Card>
      <CardHeader title="Spending by weekday" description="Average spent on each day of the week" />
      <div className="h-48 w-full" role="img" aria-label={`Average spending by weekday: ${weekdays.map((w) => `${w.day} ${money(w.average, { decimals: 0 })}`).join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weekdays} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis dataKey="day" tickFormatter={(d) => d.slice(0, 3)} tickLine={false} axisLine={{ stroke: colors.border }} tick={{ fill: colors.muted, fontSize: 12 }} />
            <YAxis width={52} tickLine={false} axisLine={false} tick={{ fill: colors.muted, fontSize: 12 }} tickFormatter={(v) => money(v, { compact: true })} />
            <Tooltip cursor={{ fill: colors.border, opacity: 0.35 }} content={<ChartTooltip formatValue={(v) => money(v)} />} />
            <Bar dataKey="average" name="Average spend" fill={colors.series[0]} radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function PaymentMethods({ methods }) {
  const money = useMoney();
  return (
    <Card>
      <CardHeader title="Payment methods" />
      {methods.length === 0 ? (
        <p className="text-sm text-muted">No expenses in this period.</p>
      ) : (
        <ul className="space-y-2.5">
          {methods.map((m) => (
            <li key={m.method} className="text-sm">
              <div className="flex justify-between gap-2">
                <span>{m.method}</span>
                <span className="tabular text-muted">
                  {money(m.total, { decimals: 0 })} · <span className="font-semibold text-text">{m.share}%</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <div className="h-full rounded-full" style={{ width: `${m.share}%`, background: 'var(--series-1)' }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TopMerchants({ merchants }) {
  const money = useMoney();
  return (
    <Card>
      <CardHeader title="Biggest spends by description" description="Where repeated spending adds up" />
      <ol className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {merchants.map((m, i) => (
          <li key={m.name} className="flex items-center gap-3 text-sm">
            <span className="tabular w-5 text-muted">{i + 1}.</span>
            <span className="min-w-0 flex-1 truncate">{m.name}</span>
            <span className="text-xs text-muted">{m.count}×</span>
            <span className="tabular font-semibold">{money(m.total, { decimals: 0 })}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function UnusualList({ state }) {
  const money = useMoney();
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
            Unusual expenses
          </span>
        }
        description="Last 90 days, compared with your usual spending in each category"
      />
      {state.error ? (
        <ErrorState error={state.error} onRetry={state.reload} />
      ) : !state.data ? (
        <Skeleton className="h-40" />
      ) : state.data.items.length === 0 ? (
        <p className="text-sm text-muted">
          {state.data.historySize < 10 ? 'Not enough history to judge yet.' : 'Nothing unusual — your spending has been consistent.'}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {state.data.items.map((u) => (
            <li key={u.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate font-medium">{u.description}</span>
                <span className="tabular shrink-0 font-semibold">{money(u.amount, { decimals: 0 })}</span>
              </div>
              <p className="text-xs text-muted">
                {formatShortDate(u.date)} · {u.category} · {u.explanation}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">
        Flagged when an expense is at least 3× your typical one in that category and well outside its usual range.
      </p>
    </Card>
  );
}
