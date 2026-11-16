import { createElement, useState } from 'react';
import { Archive, ArchiveRestore, CalendarClock, History, MinusCircle, MoreHorizontal, Pencil, PiggyBank, Plus, Target, Trash2, TrendingUp } from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { ProgressBar } from '../components/ui/ProgressBar.jsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.jsx';
import { ContributionModal, GoalFormModal, GoalHistoryModal } from '../components/goals/GoalModals.jsx';
import { GOAL_ICON_COMPONENTS, PACE } from '../components/goals/goalVisuals.js';
import { useAsync } from '../hooks/useAsync.js';
import { useMoney } from '../hooks/useMoney.js';
import { useToast } from '../context/toast.js';
import { goalService } from '../services/financeServices.js';
import { formatDate, formatMonthKey } from '../utils/format.js';
import { cn } from '../utils/cn.js';

export default function Goals() {
  const money = useMoney();
  const toast = useToast();
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);
  const { data, error, reload } = useAsync(() => goalService.list(), [version]);

  const [tab, setTab] = useState('active');
  const [form, setForm] = useState({ open: false, goal: null });
  const [contribution, setContribution] = useState({ goalId: null, type: 'deposit' });
  const [historyId, setHistoryId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const goals = data?.items ?? [];
  const byId = (id) => goals.find((g) => g.id === id) ?? null;
  const visible = goals.filter((g) => g.status === tab);
  const counts = { active: 0, completed: 0, archived: 0 };
  goals.forEach((g) => (counts[g.status] += 1));

  async function setArchived(goal, archived) {
    try {
      await goalService.update(goal.id, { status: archived ? 'archived' : 'active' });
      toast.success(archived ? `"${goal.name}" archived` : `"${goal.name}" restored`);
      refresh();
    } catch (err) {
      toast.error('Could not update goal', err.message);
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await goalService.remove(toDelete.id);
      toast.success('Goal deleted');
      setToDelete(null);
      refresh();
    } catch (err) {
      toast.error('Could not delete goal', err.message);
    } finally {
      setBusy(false);
    }
  }

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Set targets, add money as you save, and see whether you are on pace.</p>
        <Button onClick={() => setForm({ open: true, goal: null })}>
          <Plus className="size-4" aria-hidden="true" />
          New goal
        </Button>
      </div>

      <section aria-label="Savings summary" className="grid gap-3 sm:grid-cols-3">
        <SummaryCard icon={PiggyBank} label="Saved in active goals" loading={!summary} value={summary && money(summary.totalSaved)} hint={summary && `of ${money(summary.totalTarget)} target`} />
        <SummaryCard icon={CalendarClock} label="Needed per month" loading={!summary} value={summary && money(summary.requiredMonthly)} hint="To meet every deadline" />
        <SummaryCard icon={Target} label="Goals" loading={!summary} value={summary && `${summary.activeCount} active`} hint={summary && `${summary.completedCount} completed`} />
      </section>

      <SegmentedControl
        label="Show goals"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'active', label: `Active (${counts.active})` },
          { value: 'completed', label: `Completed (${counts.completed})` },
          { value: 'archived', label: `Archived (${counts.archived})` },
        ]}
      />

      {error ? (
        <Card>
          <ErrorState title="Could not load goals" error={error} onRetry={reload} />
        </Card>
      ) : !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-60" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={PiggyBank}
            title={tab === 'active' ? 'No active goals' : `No ${tab} goals`}
            description={tab === 'active' ? 'Create a goal for an emergency fund, a trip or a new laptop.' : undefined}
            action={
              tab === 'active' && (
                <Button onClick={() => setForm({ open: true, goal: null })}>
                  <Plus className="size-4" aria-hidden="true" />
                  New goal
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              money={money}
              onAdd={() => setContribution({ goalId: goal.id, type: 'deposit' })}
              onWithdraw={() => setContribution({ goalId: goal.id, type: 'withdrawal' })}
              onEdit={() => setForm({ open: true, goal })}
              onHistory={() => setHistoryId(goal.id)}
              onArchive={() => setArchived(goal, goal.status !== 'archived')}
              onDelete={() => setToDelete(goal)}
            />
          ))}
        </ul>
      )}

      <GoalFormModal open={form.open} goal={form.goal} onClose={() => setForm({ open: false, goal: null })} onSaved={refresh} />
      <ContributionModal
        open={Boolean(contribution.goalId)}
        goal={byId(contribution.goalId)}
        initialType={contribution.type}
        onClose={() => setContribution({ goalId: null, type: 'deposit' })}
        onSaved={refresh}
      />
      <GoalHistoryModal open={Boolean(historyId)} goal={byId(historyId)} onClose={() => setHistoryId(null)} onChanged={refresh} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this goal?"
        description={toDelete ? `"${toDelete.name}" and its ${toDelete.contributions.length} contribution records will be permanently deleted. Archive it instead to keep the history.` : undefined}
        confirmLabel="Delete goal"
        destructive
        loading={busy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, hint, loading }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Icon className="size-4 text-accent" aria-hidden="true" />
        {label}
      </div>
      {loading ? <Skeleton className="mt-2 h-7 w-2/3" /> : <p className="tabular mt-1.5 text-2xl font-bold">{value}</p>}
      {hint && !loading && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

function GoalCard({ goal, money, onAdd, onWithdraw, onEdit, onHistory, onArchive, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pace = PACE[goal.pace];
  const archived = goal.status === 'archived';
  const completed = goal.status === 'completed';

  const menu = [
    { label: 'Edit goal', icon: Pencil, action: onEdit },
    { label: 'History', icon: History, action: onHistory },
    !archived && goal.saved > 0 && { label: 'Withdraw', icon: MinusCircle, action: onWithdraw },
    { label: archived ? 'Restore' : 'Archive', icon: archived ? ArchiveRestore : Archive, action: onArchive },
    { label: 'Delete', icon: Trash2, action: onDelete, danger: true },
  ].filter(Boolean);

  return (
    <li>
      <Card className={cn('flex h-full flex-col', archived && 'opacity-70')}>
        <div className="flex items-start gap-3">
          <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', completed ? 'bg-success/12 text-success' : 'bg-accent-soft text-accent')}>
            {createElement(GOAL_ICON_COMPONENTS[goal.icon] ?? PiggyBank, { className: 'size-5', 'aria-hidden': true })}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{goal.name}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge tone={pace.tone}>{pace.label}</Badge>
              {goal.priority === 'high' && !completed && <Badge tone="accent">High priority</Badge>}
            </div>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              onBlur={(e) => {
                if (!e.currentTarget.parentElement.contains(e.relatedTarget)) setMenuOpen(false);
              }}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`More actions for ${goal.name}`}
              className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text"
            >
              <MoreHorizontal className="size-4" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute top-10 right-0 z-10 w-40 rounded-xl border border-border bg-surface p-1 shadow-card">
                {menu.map(({ label, icon: Icon, action, danger }) => (
                  <button
                    key={label}
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      action();
                    }}
                    className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm', danger ? 'text-danger hover:bg-danger/8' : 'hover:bg-surface-2')}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="tabular text-xl font-bold">{money(goal.saved, { decimals: 0 })}</p>
            <p className="tabular text-sm text-muted">of {money(goal.targetAmount, { decimals: 0 })}</p>
          </div>
          <ProgressBar className="mt-2" value={goal.percent} tone={completed ? 'ok' : 'accent'} label={`${goal.name} progress`} />
          <p className="mt-1.5 text-xs text-muted">{goal.percent}% saved</p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Target date</dt>
            <dd className="font-medium">{goal.deadline ? formatDate(goal.deadline) : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{completed ? 'Completed' : 'Needed / month'}</dt>
            <dd className="tabular font-medium">
              {completed ? formatDate(goal.completedAt) : goal.requiredMonthly !== null ? money(goal.requiredMonthly, { decimals: 0 }) : '—'}
            </dd>
          </div>
          {!completed && (
            <div className="col-span-2 flex items-center gap-1.5 text-xs text-muted">
              <TrendingUp className="size-3.5" aria-hidden="true" />
              {goal.averageMonthly > 0
                ? `Saving ${money(goal.averageMonthly, { decimals: 0 })}/month recently${goal.projectedCompletion ? ` · done by ${formatMonthKey(goal.projectedCompletion)}` : ''}`
                : 'No contributions in the last 3 months'}
            </div>
          )}
        </dl>

        {!archived && !completed && (
          <Button className="mt-5 w-full" variant="secondary" onClick={onAdd}>
            <Plus className="size-4" aria-hidden="true" />
            Add money
          </Button>
        )}
      </Card>
    </li>
  );
}
