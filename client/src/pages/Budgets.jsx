import { createElement, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Lightbulb,
  Pencil,
  PieChart,
  Plus,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { ProgressBar } from '../components/ui/ProgressBar.jsx';
import { BudgetStatusBadge } from '../components/budgets/BudgetStatus.jsx';
import { budgetReasonText } from '../components/budgets/budgetText.js';
import { BudgetFormModal } from '../components/budgets/BudgetFormModal.jsx';
import { FiftyThirtyTwentyModal } from '../components/budgets/FiftyThirtyTwentyModal.jsx';
import { categoryIcon } from '../components/transactions/categoryStyles.js';
import { useAsync } from '../hooks/useAsync.js';
import { useMeta } from '../hooks/useMeta.js';
import { useMoney } from '../hooks/useMoney.js';
import { useToast } from '../context/toast.js';
import { budgetService } from '../services/financeServices.js';
import { currentMonthKey, formatMonthLong, shiftMonthKey } from '../utils/months.js';
import { formatMonthKey } from '../utils/format.js';
import { cn } from '../utils/cn.js';

export default function Budgets() {
  const money = useMoney();
  const toast = useToast();
  const { data: meta } = useMeta();
  const [month, setMonth] = useState(currentMonthKey);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);

  const overview = useAsync(() => budgetService.overview(month), [month, version]);
  const recs = useAsync(() => budgetService.recommendations(month), [month, version]);

  const [form, setForm] = useState({ open: false, budget: null, presetCategory: null });
  const [planOpen, setPlanOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copying, setCopying] = useState(false);

  const data = overview.data;
  const hasBudgets = Boolean(data && (data.overall || data.categories.length));
  const isCurrentMonth = month === currentMonthKey();

  async function copyFromPrevious() {
    setCopying(true);
    try {
      const result = await budgetService.copy(shiftMonthKey(month, -1), month);
      toast.success(
        result.copied ? `Copied ${result.copied} budget${result.copied === 1 ? '' : 's'}` : 'Nothing new to copy',
        result.skipped ? `${result.skipped} already existed for ${formatMonthLong(month)}.` : undefined,
      );
      refresh();
    } catch (error) {
      toast.error('Could not copy budgets', error.message);
    } finally {
      setCopying(false);
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await budgetService.remove(toDelete.id);
      toast.success('Budget removed');
      setToDelete(null);
      refresh();
    } catch (error) {
      toast.error('Could not remove budget', error.message);
    } finally {
      setBusy(false);
    }
  }

  async function applyRecommendation(items) {
    try {
      await budgetService.bulk(
        month,
        items.map((r) => ({ category: r.category, limit: r.suggestedLimit })),
      );
      toast.success(items.length === 1 ? `${items[0].category} budget set` : `${items.length} budgets set`);
      refresh();
    } catch (error) {
      toast.error('Could not apply suggestion', error.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <MonthSwitcher month={month} onChange={setMonth} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={copyFromPrevious} loading={copying}>
            {!copying && <Copy className="size-4" aria-hidden="true" />}
            Copy {formatMonthKey(shiftMonthKey(month, -1))}
          </Button>
          <Button variant="secondary" onClick={() => setPlanOpen(true)}>
            <PieChart className="size-4" aria-hidden="true" />
            50/30/20 plan
          </Button>
          <Button onClick={() => setForm({ open: true, budget: null, presetCategory: null })}>
            <Plus className="size-4" aria-hidden="true" />
            Add budget
          </Button>
        </div>
      </div>

      {overview.error ? (
        <Card>
          <ErrorState title="Could not load budgets" error={overview.error} onRetry={overview.reload} />
        </Card>
      ) : !data ? (
        <div className="grid gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {data.alerts.length > 0 && <AlertsBanner alerts={data.alerts} money={money} />}

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr] [&>*]:min-w-0">
            <div className="space-y-6">
              <OverallCard
                data={data}
                money={money}
                isCurrentMonth={isCurrentMonth}
                onSet={() => setForm({ open: true, budget: null, presetCategory: null })}
                onEdit={() => setForm({ open: true, budget: data.overall })}
              />

              <Card>
                <CardHeader
                  title="Category budgets"
                  description={
                    data.categories.length
                      ? `${money(data.totalCategoryLimits)} allocated across ${data.categories.length} categories`
                      : 'Limit individual categories like dining out or shopping.'
                  }
                />
                {data.categories.length === 0 ? (
                  <EmptyState
                    icon={WalletCards}
                    title={hasBudgets ? 'No category budgets yet' : `No budgets for ${formatMonthLong(month)}`}
                    description="Set limits yourself, use a suggestion, or generate a 50/30/20 plan."
                    action={
                      <Button onClick={() => setForm({ open: true, budget: null, presetCategory: null })}>
                        <Plus className="size-4" aria-hidden="true" />
                        Add budget
                      </Button>
                    }
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {data.categories.map((budget) => (
                      <CategoryBudgetRow
                        key={budget.id}
                        budget={budget}
                        money={money}
                        onEdit={() => setForm({ open: true, budget })}
                        onDelete={() => setToDelete(budget)}
                      />
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <RecommendationsCard
                state={recs}
                money={money}
                onApply={applyRecommendation}
              />
              {data.unbudgeted.length > 0 && (
                <Card>
                  <CardHeader title="Spending without a budget" description={`Categories you spent in during ${formatMonthLong(month)}.`} />
                  <ul className="space-y-2">
                    {data.unbudgeted.map(({ category, spent }) => (
                      <li key={category} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate">{category}</span>
                        <span className="flex items-center gap-2">
                          <span className="tabular font-medium">{money(spent)}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setForm({ open: true, budget: null, presetCategory: category })}
                            aria-label={`Set a budget for ${category}`}
                          >
                            <Plus className="size-3.5" aria-hidden="true" />
                            Budget
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      <BudgetFormModal
        open={form.open}
        month={month}
        budget={form.budget}
        presetCategory={form.presetCategory}
        takenCategories={data?.categories.map((b) => b.category) ?? []}
        hasOverall={Boolean(data?.overall)}
        meta={meta}
        onClose={() => setForm({ open: false, budget: null, presetCategory: null })}
        onSaved={refresh}
      />
      <FiftyThirtyTwentyModal open={planOpen} month={month} onClose={() => setPlanOpen(false)} onApplied={refresh} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Remove this budget?"
        description={toDelete ? `The ${toDelete.category ?? 'overall'} budget for ${formatMonthLong(month)} will be removed. Your transactions are not affected.` : undefined}
        confirmLabel="Remove"
        destructive
        loading={busy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function MonthSwitcher({ month, onChange }) {
  const current = currentMonthKey();
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="icon" onClick={() => onChange(shiftMonthKey(month, -1))} aria-label="Previous month">
        <ChevronLeft className="size-4" />
      </Button>
      <p className="min-w-40 text-center text-lg font-semibold" aria-live="polite">
        {formatMonthLong(month)}
      </p>
      <Button variant="secondary" size="icon" onClick={() => onChange(shiftMonthKey(month, 1))} aria-label="Next month">
        <ChevronRight className="size-4" />
      </Button>
      {month !== current && (
        <Button variant="ghost" size="sm" onClick={() => onChange(current)}>
          This month
        </Button>
      )}
    </div>
  );
}

function AlertsBanner({ alerts, money }) {
  const over = alerts.filter((a) => a.status === 'over');
  return (
    <div role="status" className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/8 p-4">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
      <div className="text-sm">
        <p className="font-semibold">
          {[
            over.length && `${over.length} over the limit`,
            alerts.length - over.length && `${alerts.length - over.length} close to the limit`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <ul className="mt-1 space-y-0.5 text-muted">
          {alerts.slice(0, 4).map((a) => (
            <li key={a.budgetId}>
              <span className="font-medium text-text">{a.category ?? 'Overall budget'}</span>:{' '}
              {a.reason === 'over_limit'
                ? `${money(a.spent - a.limit)} over`
                : a.reason === 'on_pace_to_exceed'
                  ? `on pace for ${money(a.projected)} of ${money(a.limit)}`
                  : `${money(a.spent)} of ${money(a.limit)} used`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function OverallCard({ data, money, isCurrentMonth, onSet, onEdit }) {
  const overall = data.overall;
  if (!overall) {
    return (
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted">Total spent in {formatMonthLong(data.month)}</p>
          <p className="tabular mt-1 text-3xl font-bold">{money(data.totalSpent)}</p>
          <p className="mt-1 text-sm text-muted">Set an overall limit to see how much is left for the month.</p>
        </div>
        <Button variant="secondary" onClick={onSet}>
          Set monthly budget
        </Button>
      </Card>
    );
  }

  const tone = overall.status;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Overall budget · {formatMonthLong(data.month)}</p>
          <p className="tabular mt-1 text-3xl font-bold">
            {money(overall.spent)} <span className="text-base font-medium text-muted">of {money(overall.limit)}</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <BudgetStatusBadge status={overall.status} />
          <button type="button" onClick={onEdit} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label="Edit overall budget">
            <Pencil className="size-4" />
          </button>
        </div>
      </div>
      <ProgressBar className="mt-4" value={overall.percent} tone={tone} label="Overall budget used" />
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <Stat label={overall.remaining >= 0 ? 'Left to spend' : 'Over by'} value={money(Math.abs(overall.remaining))} emphasis={overall.remaining < 0 ? 'text-danger' : undefined} />
        <Stat label="Used" value={`${Math.round(overall.percent)}%`} />
        {isCurrentMonth && <Stat label="Daily allowance" value={overall.dailyAllowance !== null ? money(overall.dailyAllowance) : '—'} />}
        {isCurrentMonth && (
          <Stat
            label="Projected month-end"
            value={overall.projected !== null ? money(overall.projected) : 'Too early'}
            emphasis={overall.projected > overall.limit ? 'text-warning' : undefined}
          />
        )}
      </dl>
      {isCurrentMonth && (
        <p className="mt-3 text-xs text-muted">
          Day {data.pace.daysElapsed} of {data.pace.daysInMonth}. Projection counts fixed costs (rent, EMIs, bills, subscriptions, investments) once and extends other spending at its daily rate.
        </p>
      )}
    </Card>
  );
}

function Stat({ label, value, emphasis }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className={cn('tabular mt-0.5 font-semibold', emphasis)}>{value}</dd>
    </div>
  );
}

function CategoryBudgetRow({ budget, money, onEdit, onDelete }) {
  const reason = budgetReasonText(budget, money);
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
          {createElement(categoryIcon(budget.category, 'expense'), { className: 'size-[18px]', 'aria-hidden': true })}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate font-medium">{budget.category}</p>
            <BudgetStatusBadge status={budget.status} />
          </div>
          <p className="tabular mt-0.5 text-sm text-muted">
            {money(budget.spent)} of {money(budget.limit)}
            {budget.remaining >= 0 && <> · {money(budget.remaining)} left</>}
          </p>
        </div>
        <div className="flex shrink-0">
          <button type="button" onClick={onEdit} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label={`Edit ${budget.category} budget`}>
            <Pencil className="size-4" />
          </button>
          <button type="button" onClick={onDelete} className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger" aria-label={`Remove ${budget.category} budget`}>
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      <ProgressBar className="mt-3" size="sm" value={budget.percent} tone={budget.status} label={`${budget.category} budget used`} />
      {reason && <p className={cn('mt-1.5 text-xs font-medium', budget.status === 'over' ? 'text-danger' : 'text-warning')}>{reason}</p>}
    </li>
  );
}

function RecommendationsCard({ state, money, onApply }) {
  const [applying, setApplying] = useState(null);
  const items = state.data?.items ?? [];
  const actionable = items.filter((r) => r.currentLimit !== r.suggestedLimit);

  async function apply(list, key) {
    setApplying(key);
    await onApply(list);
    setApplying(null);
  }

  return (
    <Card>
      <CardHeader
        title="Suggested budgets"
        description="From a typical month of your last 3 completed months, rounded up."
        action={
          actionable.length > 1 && (
            <Button size="sm" variant="secondary" loading={applying === 'all'} onClick={() => apply(actionable, 'all')}>
              Apply all
            </Button>
          )
        }
      />
      {state.error ? (
        <ErrorState error={state.error} onRetry={state.reload} />
      ) : !state.data ? (
        <Skeleton className="h-40" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Not enough history yet"
          description="Suggestions appear once you have spending in at least 2 of the last 3 months."
          className="py-8"
        />
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.category} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.category}</p>
                <p className="text-xs text-muted">
                  Typical month {money(r.typicalMonthly, { decimals: 0 })} · {r.note}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="tabular font-semibold">{money(r.suggestedLimit, { decimals: 0 })}</span>
                {r.currentLimit === r.suggestedLimit ? (
                  <span className="text-xs text-muted">Set</span>
                ) : (
                  <Button size="sm" variant="ghost" loading={applying === r.category} onClick={() => apply([r], r.category)}>
                    {r.currentLimit ? 'Update' : 'Apply'}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
