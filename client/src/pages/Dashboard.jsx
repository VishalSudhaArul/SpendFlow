import { createElement } from 'react';
import { Link } from 'react-router';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Landmark,
  PiggyBank,
  Plus,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ProgressBar } from '../components/ui/ProgressBar.jsx';
import { BudgetStatusBadge } from '../components/budgets/BudgetStatus.jsx';
import { HealthScoreCard } from '../components/dashboard/HealthScoreCard.jsx';
import { SafeToSpendCard } from '../components/dashboard/SafeToSpendCard.jsx';
import { AISummaryCard } from '../components/dashboard/AISummaryCard.jsx';
import { UpcomingBillsCard } from '../components/dashboard/UpcomingBillsCard.jsx';
import { IncomeExpenseChart } from '../components/charts/IncomeExpenseChart.jsx';
import { categoryIcon } from '../components/transactions/categoryStyles.js';
import { GOAL_ICON_COMPONENTS } from '../components/goals/goalVisuals.js';
import { useAsync } from '../hooks/useAsync.js';
import { useMoney } from '../hooks/useMoney.js';
import { useAuth } from '../context/auth.js';
import { dashboardService } from '../services/financeServices.js';
import { formatMonthKey, formatShortDate } from '../utils/format.js';
import { formatMonthLong } from '../utils/months.js';
import { cn } from '../utils/cn.js';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, error, reload } = useAsync(() => dashboardService.get(), []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold sm:text-2xl">
          {greeting()}, {user.name.split(' ')[0]}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {data ? `Here is where ${formatMonthLong(data.month)} stands — day ${data.pace.daysElapsed} of ${data.pace.daysInMonth}.` : 'Loading your overview…'}
        </p>
      </div>

      {error ? (
        <Card>
          <ErrorState title="Could not load your dashboard" error={error} onRetry={reload} />
        </Card>
      ) : !data ? (
        <DashboardSkeleton />
      ) : data.balance.transactionCount === 0 ? (
        <Card>
          <EmptyState
            icon={WalletCards}
            title="Welcome to SpendFlow"
            description="Add your first income and a few expenses — your balance, safe-to-spend amount and health score will appear here."
            action={
              <Link to="/transactions" className="inline-flex h-10 items-center gap-2 rounded-xl brand-gradient px-4 text-sm font-semibold text-white">
                <Plus className="size-4" aria-hidden="true" />
                Add a transaction
              </Link>
            }
          />
        </Card>
      ) : (
        <DashboardContent data={data} />
      )}
    </div>
  );
}

function DashboardContent({ data }) {
  const money = useMoney();
  const { thisMonth, balance } = data;

  return (
    <>
      <AISummaryCard />

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile icon={Landmark} label="Total balance" value={money(balance.balance, { decimals: 0 })} hint="All income minus all spending tracked" tone="accent" />
        <KpiTile icon={ArrowDownLeft} label="Income this month" value={money(thisMonth.income, { decimals: 0 })} hint={thisMonth.incomeExpected ? `+${money(thisMonth.incomeExpected, { decimals: 0 })} still expected` : 'All expected income received'} tone="success" />
        <KpiTile icon={ArrowUpRight} label="Spent this month" value={money(thisMonth.expense, { decimals: 0 })} hint={data.runRate.projected !== null ? `On pace for ${money(data.runRate.projected, { decimals: 0 })}` : null} tone="danger" />
        <KpiTile
          icon={PiggyBank}
          label="Saved this month"
          value={money(thisMonth.net, { decimals: 0 })}
          hint={thisMonth.savingsRate !== null ? `${thisMonth.savingsRate}% savings rate` : null}
          tone={thisMonth.net >= 0 ? 'success' : 'danger'}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        <SafeToSpendCard safe={data.safeToSpend} daysLeft={data.pace.daysLeft + 1} />
        <HealthScoreCard health={data.healthScore} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
        <Card>
          <CardHeader title="Income vs expenses" description="Last 6 months" action={<SeeAll to="/analytics" label="Analytics" />} />
          <IncomeExpenseChart data={data.incomeVsExpense} xKey="month" formatLabel={formatMonthKey} ariaLabel="Income and expenses, last 6 months" />
        </Card>
        <MonthComparisonCard comparison={data.monthComparison} money={money} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
        <RecentTransactionsCard items={data.recentTransactions} money={money} />
        <BudgetsCard budgets={data.budgets} money={money} />
        <div className="space-y-6">
          <UpcomingBillsCard upcoming={data.upcomingBills} />
          {data.unusualExpenses.length > 0 && <UnusualCard items={data.unusualExpenses} money={money} />}
          <GoalsCard goals={data.goals} money={money} />
        </div>
      </div>
    </>
  );
}

const TONE = {
  accent: 'bg-accent-soft text-accent-ink',
  success: 'bg-success/12 text-success',
  danger: 'bg-danger/12 text-danger',
};

function KpiTile({ icon: Icon, label, value, hint, tone }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', TONE[tone])}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <p className="text-xs font-medium text-muted sm:text-sm">{label}</p>
      </div>
      <p className="tabular mt-2 truncate text-xl font-bold sm:text-2xl" title={value}>
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
    </Card>
  );
}

function SeeAll({ to, label = 'See all' }) {
  return (
    <Link to={to} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-accent-ink hover:underline">
      {label}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

function MonthComparisonCard({ comparison, money }) {
  const diff = comparison.currentTotal - comparison.previousTotal;
  const max = Math.max(1, ...comparison.categories.flatMap((c) => [c.current, c.previous]));
  return (
    <Card>
      <CardHeader title="Compared with last month" description={`Days 1–${comparison.throughDay} of each month`} />
      <p className="text-sm">
        <span className="tabular text-2xl font-bold">{money(comparison.currentTotal, { decimals: 0 })}</span>
        <span className={cn('ml-2 inline-flex items-center gap-1 text-sm font-semibold', diff > 0 ? 'text-danger' : 'text-success')}>
          {diff > 0 ? <TrendingUp className="size-4" aria-hidden="true" /> : <TrendingDown className="size-4" aria-hidden="true" />}
          {money(Math.abs(diff), { decimals: 0 })} {diff > 0 ? 'more' : 'less'}
        </span>
      </p>
      <p className="text-xs text-muted">vs {money(comparison.previousTotal, { decimals: 0 })} by this point last month</p>
      {comparison.categories.length > 0 && (
        <ul className="mt-4 space-y-3">
          {comparison.categories.map((c) => (
            <li key={c.category} className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="truncate">{c.category}</span>
                <span className="tabular shrink-0 text-muted">
                  {money(c.current, { decimals: 0 })}{' '}
                  <span className={cn('text-xs', c.change > 0 ? 'text-danger' : c.change < 0 ? 'text-success' : '')}>
                    ({c.change > 0 ? '+' : c.change < 0 ? '−' : '±'}
                    {money(Math.abs(c.change), { decimals: 0 })})
                  </span>
                </span>
              </div>
              {/* Thin paired bars: this month (solid) above last month (faint). */}
              <div className="mt-1 space-y-0.5" aria-hidden="true">
                <div className="h-1.5 rounded-full bg-accent" style={{ width: `${(c.current / max) * 100}%` }} />
                <div className="h-1.5 rounded-full bg-muted/35" style={{ width: `${(c.previous / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 flex items-center gap-3 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-accent" /> This month</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-muted/35" /> Last month</span>
      </p>
    </Card>
  );
}

function RecentTransactionsCard({ items, money }) {
  return (
    <Card>
      <CardHeader title="Recent transactions" action={<SeeAll to="/transactions" />} />
      <ul className="divide-y divide-border">
        {items.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', t.type === 'income' ? 'bg-success/12 text-success' : 'bg-accent-soft text-accent-ink')}>
              {createElement(categoryIcon(t.category, t.type), { className: 'size-4', 'aria-hidden': true })}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.description}</p>
              <p className="truncate text-xs text-muted">
                {t.category} · {formatShortDate(t.date)}
              </p>
            </div>
            <span className={cn('tabular shrink-0 text-sm font-semibold', t.type === 'income' && 'text-success')}>
              {t.type === 'income' ? '+' : '−'}
              {money(t.amount, { decimals: 0 })}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function BudgetsCard({ budgets, money }) {
  const list = [budgets.overall && { ...budgets.overall, category: 'Overall' }, ...budgets.categories].filter(Boolean);
  return (
    <Card>
      <CardHeader
        title="Budget progress"
        description={budgets.alertCount ? `${budgets.alertCount} need attention` : list.length ? 'All within limits' : undefined}
        action={<SeeAll to="/budgets" />}
      />
      {list.length === 0 ? (
        <EmptyState
          icon={WalletCards}
          title="No budgets this month"
          className="py-6"
          action={
            <Link to="/budgets" className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm font-semibold hover:bg-surface-2">
              Set budgets
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {list.slice(0, 6).map((b) => (
            <li key={b.id}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{b.category}</span>
                <BudgetStatusBadge status={b.status} />
              </div>
              <ProgressBar className="mt-1.5" size="sm" value={b.percent} tone={b.status} label={`${b.category} budget used`} />
              <p className="tabular mt-1 text-xs text-muted">
                {money(b.spent, { decimals: 0 })} of {money(b.limit, { decimals: 0 })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function GoalsCard({ goals, money }) {
  return (
    <Card>
      <CardHeader title="Savings goals" action={<SeeAll to="/goals" />} />
      {goals.length === 0 ? (
        <p className="text-sm text-muted">
          No active goals. <Link to="/goals" className="font-semibold text-accent-ink hover:underline">Create one</Link>
        </p>
      ) : (
        <ul className="space-y-4">
          {goals.map((g) => (
            <li key={g.id} className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                {createElement(GOAL_ICON_COMPONENTS[g.icon] ?? PiggyBank, { className: 'size-4', 'aria-hidden': true })}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{g.name}</span>
                  <span className="tabular shrink-0 text-muted">{g.percent}%</span>
                </div>
                <ProgressBar className="mt-1.5" size="sm" value={g.percent} label={`${g.name} progress`} />
                <p className="tabular mt-1 text-xs text-muted">
                  {money(g.saved, { decimals: 0 })} of {money(g.targetAmount, { decimals: 0 })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function UnusualCard({ items, money }) {
  return (
    <Card className="border-warning/30">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
            Unusual spending
          </span>
        }
        description="Last 30 days"
      />
      <ul className="space-y-3">
        {items.map((u) => (
          <li key={u.id} className="text-sm">
            <div className="flex justify-between gap-2">
              <span className="truncate font-medium">{u.description}</span>
              <span className="tabular shrink-0 font-semibold">{money(u.amount, { decimals: 0 })}</span>
            </div>
            <p className="text-xs text-muted">
              {formatShortDate(u.date)} · {u.explanation} (usually {money(u.typicalAmount, { decimals: 0 })})
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
