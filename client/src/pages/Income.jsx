import { useState } from 'react';
import { BadgeIndianRupee, CalendarClock, HandCoins, MoreHorizontal, Pause, Pencil, Play, Plus, Trash2, Wallet } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { IncomeChart } from '../components/income/IncomeChart.jsx';
import { IncomeSourceModal, ReceiveIncomeModal } from '../components/income/IncomeModals.jsx';
import { TYPE_LABELS } from '../components/income/incomeLabels.js';
import { TransactionList, TransactionListSkeleton } from '../components/transactions/TransactionList.jsx';
import { TransactionFormModal } from '../components/transactions/TransactionFormModal.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useMeta } from '../hooks/useMeta.js';
import { useMoney } from '../hooks/useMoney.js';
import { useToast } from '../context/toast.js';
import { incomeService, transactionService } from '../services/financeServices.js';
import { capitalize, formatDate } from '../utils/format.js';
import { cn } from '../utils/cn.js';

const FREQUENCY_LABEL = { biweekly: 'Every 2 weeks' };

export default function Income() {
  const toast = useToast();
  const money = useMoney();
  const { data: meta } = useMeta();
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);

  const sources = useAsync(() => incomeService.listSources(), [version]);
  const summary = useAsync(() => incomeService.summary(6), [version]);

  const [sourceModal, setSourceModal] = useState({ open: false, source: null });
  const [receiveFor, setReceiveFor] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  async function toggleActive(source) {
    try {
      await incomeService.updateSource(source.id, { isActive: !source.isActive });
      toast.success(source.isActive ? `${source.name} paused` : `${source.name} resumed`);
      refresh();
    } catch (error) {
      toast.error('Could not update source', error.message);
    }
  }

  async function deleteSource() {
    setBusy(true);
    try {
      await incomeService.removeSource(confirm.id);
      toast.success('Income source deleted', 'Income already received stays in your history.');
      setConfirm(null);
      refresh();
    } catch (error) {
      toast.error('Could not delete source', error.message);
    } finally {
      setBusy(false);
    }
  }

  const s = summary.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Track every source of income and what has actually arrived.</p>
        <Button onClick={() => setSourceModal({ open: true, source: null })}>
          <Plus className="size-4" aria-hidden="true" />
          Add income source
        </Button>
      </div>

      <section aria-label="Income overview" className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={HandCoins} label="Received this month" value={s && money(s.receivedThisMonth)} loading={summary.loading && !s} />
        <StatCard
          icon={CalendarClock}
          label="Expected per month"
          value={s && money(s.expectedMonthly)}
          hint="From active recurring sources"
          loading={summary.loading && !s}
        />
        <StatCard
          icon={BadgeIndianRupee}
          label="Average monthly income"
          value={s && (s.averageMonthly ? money(s.averageMonthly) : '—')}
          hint={s && !s.averageMonthly ? 'Needs at least one completed month' : 'Completed months, last 6'}
          loading={summary.loading && !s}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        <Card>
          <CardHeader title="Monthly income" description="Money received over the last 6 months, by source." />
          {summary.error ? (
            <ErrorState error={summary.error} onRetry={summary.reload} />
          ) : !s ? (
            <Skeleton className="h-64" />
          ) : s.months.every((m) => m.total === 0) ? (
            <EmptyState icon={Wallet} title="No income recorded yet" description="Record income from a source to see it here." />
          ) : (
            <IncomeChart months={s.months} />
          )}
        </Card>

        <Card>
          <CardHeader title="Income sources" description="Salary, freelance clients, rent and more." />
          {sources.error ? (
            <ErrorState error={sources.error} onRetry={sources.reload} />
          ) : !sources.data ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : sources.data.length === 0 ? (
            <EmptyState
              icon={HandCoins}
              title="No income sources yet"
              description="Add your salary or other income to track it every month."
              action={<Button onClick={() => setSourceModal({ open: true, source: null })}>Add income source</Button>}
            />
          ) : (
            <ul className="space-y-3">
              {sources.data.map((source) => (
                <SourceRow
                  key={source.id}
                  source={source}
                  money={money}
                  onReceive={() => setReceiveFor(source)}
                  onEdit={() => setSourceModal({ open: true, source })}
                  onToggle={() => toggleActive(source)}
                  onDelete={() => setConfirm(source)}
                />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <IncomeHistory meta={meta} version={version} onChanged={refresh} />

      <IncomeSourceModal
        open={sourceModal.open}
        source={sourceModal.source}
        meta={meta}
        onClose={() => setSourceModal({ open: false, source: null })}
        onSaved={refresh}
      />
      <ReceiveIncomeModal open={Boolean(receiveFor)} source={receiveFor} meta={meta} onClose={() => setReceiveFor(null)} onSaved={refresh} />
      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete this income source?"
        description={confirm ? `"${confirm.name}" will be removed. Income you already received from it stays in your transaction history.` : undefined}
        confirmLabel="Delete source"
        destructive
        loading={busy}
        onConfirm={deleteSource}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, loading }) {
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

function SourceRow({ source, money, onReceive, onEdit, onToggle, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const recurring = source.frequency !== 'irregular';

  return (
    <li className={cn('rounded-xl border border-border p-4', !source.isActive && 'opacity-60')}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{source.name}</p>
            <Badge tone="accent">{TYPE_LABELS[source.type]}</Badge>
            {!source.isActive && <Badge>Paused</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">
            {source.expectedAmount > 0 ? (
              <>
                <span className="tabular font-medium text-text">{money(source.expectedAmount)}</span> ·{' '}
              </>
            ) : null}
            {FREQUENCY_LABEL[source.frequency] ?? capitalize(source.frequency)}
            {recurring && source.nextExpectedDate && source.isActive && <> · next {formatDate(source.nextExpectedDate)}</>}
          </p>
          <p className="mt-1 text-xs text-muted">
            This month: <span className="tabular font-semibold text-text">{money(source.receivedThisMonth)}</span>
            {source.receivedThisMonth > 0 && source.receivedThisMonth >= source.expectedAmount && source.expectedAmount > 0 && (
              <span className="ml-1.5 font-semibold text-success">✓ received</span>
            )}
          </p>
        </div>
        <div className="relative flex items-center gap-1">
          <Button size="sm" variant="secondary" onClick={onReceive} disabled={!source.isActive}>
            Record
          </Button>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            onBlur={(e) => {
              if (!e.currentTarget.parentElement.contains(e.relatedTarget)) setMenuOpen(false);
            }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`More actions for ${source.name}`}
            className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen && (
            <div role="menu" className="absolute top-10 right-0 z-10 w-40 rounded-xl border border-border bg-surface p-1 shadow-card">
              {[
                { label: 'Edit', icon: Pencil, action: onEdit },
                { label: source.isActive ? 'Pause' : 'Resume', icon: source.isActive ? Pause : Play, action: onToggle },
                { label: 'Delete', icon: Trash2, action: onDelete, danger: true },
              ].map(({ label, icon: Icon, action, danger }) => (
                <button
                  key={label}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    action();
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm',
                    danger ? 'text-danger hover:bg-danger/8' : 'hover:bg-surface-2',
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function IncomeHistory({ meta, version, onChanged }) {
  const toast = useToast();
  const money = useMoney();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const history = useAsync(() => transactionService.list({ type: 'income', page, limit: 10 }), [page, version]);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await transactionService.remove(toDelete.id);
      toast.success('Income entry deleted');
      setToDelete(null);
      onChanged();
    } catch (error) {
      toast.error('Could not delete', error.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Income history" description="Every income transaction, newest first." />
      {history.error ? (
        <ErrorState error={history.error} onRetry={history.reload} />
      ) : !history.data ? (
        <TransactionListSkeleton rows={4} />
      ) : history.data.items.length === 0 ? (
        <EmptyState icon={Wallet} title="No income yet" description="Income you record will appear here." />
      ) : (
        <>
          <TransactionList items={history.data.items} onEdit={setEditing} onDelete={setToDelete} />
          <div className="mt-4 border-t border-border pt-4">
            <Pagination {...history.data.meta} onChange={setPage} />
          </div>
        </>
      )}
      <TransactionFormModal open={Boolean(editing)} transaction={editing} meta={meta} onClose={() => setEditing(null)} onSaved={onChanged} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this income entry?"
        description={toDelete ? `"${toDelete.description}" (${money(toDelete.amount)}) will be permanently removed.` : undefined}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Card>
  );
}
