import { createElement, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Check,
  History,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Receipt,
  Repeat,
  SkipForward,
  Trash2,
  Undo2,
  XCircle,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.jsx';
import { BillCalendar } from '../components/bills/BillCalendar.jsx';
import { OneOffBillModal, PayBillModal, SubscriptionModal } from '../components/bills/BillModals.jsx';
import { BILL_STATE, CYCLE_LABEL, dueText } from '../components/bills/billVisuals.js';
import { categoryIcon } from '../components/transactions/categoryStyles.js';
import { useAsync } from '../hooks/useAsync.js';
import { useMeta } from '../hooks/useMeta.js';
import { useMoney } from '../hooks/useMoney.js';
import { useToast } from '../context/toast.js';
import { billService, subscriptionService } from '../services/financeServices.js';
import { formatDate, formatShortDate, todayInputValue } from '../utils/format.js';
import { currentMonthKey, shiftMonthKey } from '../utils/months.js';
import { cn } from '../utils/cn.js';

export default function Bills() {
  const money = useMoney();
  const toast = useToast();
  const { data: meta } = useMeta();
  const [version, setVersion] = useState(0);
  const refresh = () => {
    setVersion((v) => v + 1);
    window.dispatchEvent(new Event('spendflow:notifications'));
  };

  const [tab, setTab] = useState('upcoming');
  const [month, setMonth] = useState(currentMonthKey);
  const [selectedDay, setSelectedDay] = useState(null);

  const summary = useAsync(() => billService.summary(), [version]);
  const monthRange = useMemo(() => ({ from: `${month}-01`, to: `${shiftMonthKey(month, 1)}-01` }), [month]);
  const monthBills = useAsync(() => billService.list(monthRange), [monthRange, version]);
  const subscriptions = useAsync(() => subscriptionService.list(), [version]);

  const [payBill, setPayBill] = useState(null);
  const [subscriptionModal, setSubscriptionModal] = useState({ open: false, subscription: null });
  const [oneOffOpen, setOneOffOpen] = useState(false);
  const [historyFor, setHistoryFor] = useState(null);
  const [confirm, setConfirm] = useState(null); // { title, description, label, action }
  const [busy, setBusy] = useState(false);

  async function run(action, success) {
    try {
      await action();
      if (success) toast.success(success);
      refresh();
    } catch (error) {
      toast.error('Something went wrong', error.message);
    }
  }

  async function runConfirmed() {
    setBusy(true);
    await run(confirm.action, confirm.success);
    setBusy(false);
    setConfirm(null);
  }

  const today = todayInputValue();
  const s = summary.data;
  const visibleBills = (monthBills.data ?? [])
    .filter((b) => b.dueDate.slice(0, 7) === month) // the range query is inclusive of the 1st of next month
    .filter((b) => !selectedDay || b.dueDate.slice(0, 10) === selectedDay);

  const billActions = {
    onPay: setPayBill,
    onSkip: (bill) =>
      setConfirm({
        title: `Skip ${bill.name}?`,
        description: `The ${formatDate(bill.dueDate)} bill will be marked as skipped and nothing will be recorded as spent.`,
        label: 'Skip bill',
        success: 'Bill skipped',
        action: () => billService.skip(bill.id),
      }),
    onReopen: (bill) =>
      setConfirm({
        title: bill.status === 'paid' ? 'Undo this payment?' : 'Re-open this bill?',
        description: bill.status === 'paid' ? `The ${money(bill.paidAmount)} expense recorded for ${bill.name} will be deleted.` : undefined,
        label: bill.status === 'paid' ? 'Undo payment' : 'Re-open',
        success: 'Bill re-opened',
        action: () => billService.reopen(bill.id),
      }),
    onDelete: (bill) =>
      setConfirm({
        title: `Delete ${bill.name}?`,
        description: 'This one-time bill will be removed.',
        label: 'Delete',
        destructive: true,
        success: 'Bill deleted',
        action: () => billService.remove(bill.id),
      }),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Every recurring payment in one place, with reminders before they're due.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setOneOffOpen(true)}>
            <Receipt className="size-4" aria-hidden="true" />
            One-time bill
          </Button>
          <Button onClick={() => setSubscriptionModal({ open: true, subscription: null })}>
            <Plus className="size-4" aria-hidden="true" />
            Add recurring
          </Button>
        </div>
      </div>

      <section aria-label="Bills summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon={Repeat} label="Recurring per month" value={s && money(s.monthlyCost, { decimals: 0 })} hint={s && `${s.activeCount} active`} />
        <Tile icon={CalendarDays} label="Per year" value={s && money(s.yearlyCost, { decimals: 0 })} hint="At current prices" />
        <Tile icon={CalendarClock} label="Due in 30 days" value={s && money(s.next30Days.total, { decimals: 0 })} hint={s && `${s.next30Days.count} bills`} />
        <Tile
          icon={AlertTriangle}
          label="Overdue"
          value={s && money(s.overdue.total, { decimals: 0 })}
          hint={s && (s.overdue.count ? `${s.overdue.count} need attention` : 'All caught up')}
          tone={s?.overdue.count ? 'danger' : undefined}
        />
      </section>

      <SegmentedControl
        label="View"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'upcoming', label: 'Calendar' },
          { value: 'subscriptions', label: `Subscriptions${subscriptions.data ? ` (${subscriptions.data.filter((x) => x.status !== 'cancelled').length})` : ''}` },
        ]}
      />

      {tab === 'upcoming' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_1fr] [&>*]:min-w-0">
          <Card>
            {monthBills.error ? (
              <ErrorState error={monthBills.error} onRetry={monthBills.reload} />
            ) : (
              <BillCalendar
                month={month}
                onMonthChange={(m) => {
                  setMonth(m);
                  setSelectedDay(null);
                }}
                bills={monthBills.data ?? []}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                today={today}
              />
            )}
          </Card>
          <Card>
            <CardHeader
              title={selectedDay ? `Bills on ${formatDate(selectedDay)}` : 'Bills this month'}
              action={
                selectedDay && (
                  <Button size="sm" variant="ghost" onClick={() => setSelectedDay(null)}>
                    Show all
                  </Button>
                )
              }
            />
            {!monthBills.data ? (
              <div className="space-y-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : visibleBills.length === 0 ? (
              <EmptyState icon={CalendarDays} title={selectedDay ? 'Nothing due that day' : 'No bills this month'} className="py-8" />
            ) : (
              <ul className="divide-y divide-border">
                {visibleBills.map((bill) => (
                  <BillRow key={bill.id} bill={bill} money={money} {...billActions} />
                ))}
              </ul>
            )}
            {s?.overdue.count > 0 && !selectedDay && month === currentMonthKey() && (
              <OverdueElsewhere bills={s.nextBills.filter((b) => b.state === 'overdue' && !b.dueDate.startsWith(month))} money={money} actions={billActions} />
            )}
          </Card>
        </div>
      ) : (
        <SubscriptionsList
          state={subscriptions}
          money={money}
          onEdit={(subscription) => setSubscriptionModal({ open: true, subscription })}
          onHistory={setHistoryFor}
          onStatus={(sub, status) =>
            status === 'cancelled'
              ? setConfirm({
                  title: `Cancel ${sub.name}?`,
                  description: 'Future bills will stop. Past payments stay in your history. You can re-activate it later.',
                  label: 'Cancel subscription',
                  destructive: true,
                  success: `${sub.name} cancelled`,
                  action: () => subscriptionService.update(sub.id, { status }),
                })
              : run(() => subscriptionService.update(sub.id, { status }), status === 'paused' ? `${sub.name} paused` : `${sub.name} is active again`)
          }
          onDelete={(sub) =>
            setConfirm({
              title: `Delete ${sub.name}?`,
              description: 'Unpaid bills are removed. Payments you already made stay in your transactions.',
              label: 'Delete',
              destructive: true,
              success: `${sub.name} deleted`,
              action: () => subscriptionService.remove(sub.id),
            })
          }
          onAdd={() => setSubscriptionModal({ open: true, subscription: null })}
        />
      )}

      <PayBillModal bill={payBill} meta={meta} onClose={() => setPayBill(null)} onDone={refresh} />
      <SubscriptionModal
        open={subscriptionModal.open}
        subscription={subscriptionModal.subscription}
        meta={meta}
        onClose={() => setSubscriptionModal({ open: false, subscription: null })}
        onSaved={refresh}
      />
      <OneOffBillModal open={oneOffOpen} meta={meta} onClose={() => setOneOffOpen(false)} onSaved={refresh} />
      <HistoryModal subscription={historyFor} money={money} onClose={() => setHistoryFor(null)} />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        description={confirm?.description}
        confirmLabel={confirm?.label}
        destructive={confirm?.destructive}
        loading={busy}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function Tile({ icon: Icon, label, value, hint, tone }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted sm:text-sm">
        <Icon className={cn('size-4', tone === 'danger' ? 'text-danger' : 'text-accent')} aria-hidden="true" />
        {label}
      </div>
      {value === undefined || value === null ? <Skeleton className="mt-2 h-7 w-2/3" /> : <p className={cn('tabular mt-1.5 text-xl font-bold sm:text-2xl', tone === 'danger' && 'text-danger')}>{value}</p>}
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

function BillRow({ bill, money, onPay, onSkip, onReopen, onDelete }) {
  const state = BILL_STATE[bill.state];
  const open = bill.status === 'upcoming';
  return (
    <li className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', bill.state === 'overdue' ? 'bg-danger/12 text-danger' : 'bg-accent-soft text-accent')}>
        {createElement(categoryIcon(bill.category, 'expense'), { className: 'size-[18px]', 'aria-hidden': true })}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{bill.name}</p>
          <Badge tone={state.tone}>{state.label}</Badge>
        </div>
        <p className="text-xs text-muted">
          {formatShortDate(bill.dueDate)}
          {dueText(bill) && ` · ${dueText(bill)}`}
          {bill.status === 'paid' && bill.paidAt && ` · paid ${formatShortDate(bill.paidAt)}`}
          {!bill.subscriptionId && ' · one-time'}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="tabular mr-1 font-semibold">
          {bill.estimated && open && <span className="mr-0.5 text-xs font-normal text-muted">~</span>}
          {money(bill.paidAmount ?? bill.amount, { decimals: 0 })}
        </span>
        {open ? (
          <>
            <Button size="sm" onClick={() => onPay(bill)}>
              <Check className="size-3.5" aria-hidden="true" />
              Pay
            </Button>
            <button type="button" onClick={() => onSkip(bill)} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label={`Skip ${bill.name}`} title="Skip">
              <SkipForward className="size-4" />
            </button>
            {!bill.subscriptionId && (
              <button type="button" onClick={() => onDelete(bill)} className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger" aria-label={`Delete ${bill.name}`} title="Delete">
                <Trash2 className="size-4" />
              </button>
            )}
          </>
        ) : (
          <button type="button" onClick={() => onReopen(bill)} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label={`Undo ${bill.status} for ${bill.name}`} title="Undo">
            <Undo2 className="size-4" />
          </button>
        )}
      </div>
    </li>
  );
}

function OverdueElsewhere({ bills, money, actions }) {
  if (!bills.length) return null;
  return (
    <div className="mt-5 rounded-xl border border-danger/30 bg-danger/5 p-3">
      <p className="mb-2 text-sm font-semibold text-danger">Still overdue from earlier</p>
      <ul className="divide-y divide-border">
        {bills.map((bill) => (
          <BillRow key={bill.id} bill={bill} money={money} {...actions} />
        ))}
      </ul>
    </div>
  );
}

function SubscriptionsList({ state, money, onEdit, onHistory, onStatus, onDelete, onAdd }) {
  const [filter, setFilter] = useState('active');
  if (state.error) return <Card><ErrorState error={state.error} onRetry={state.reload} /></Card>;
  if (!state.data) return <Skeleton className="h-64" />;

  const list = state.data.filter((s) => (filter === 'active' ? s.status !== 'cancelled' : s.status === 'cancelled'));
  return (
    <Card>
      <CardHeader
        title="Subscriptions & recurring bills"
        action={
          <SegmentedControl
            size="sm"
            label="Filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        }
      />
      {list.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title={filter === 'active' ? 'No recurring payments yet' : 'Nothing cancelled'}
          description={filter === 'active' ? 'Add subscriptions and regular bills to get reminders before they are due.' : undefined}
          action={filter === 'active' && <Button onClick={onAdd}>Add recurring payment</Button>}
          className="py-8"
        />
      ) : (
        <ul className="divide-y divide-border">
          {list.map((sub) => (
            <SubscriptionRow key={sub.id} sub={sub} money={money} onEdit={onEdit} onHistory={onHistory} onStatus={onStatus} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function SubscriptionRow({ sub, money, onEdit, onHistory, onStatus, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = [
    { label: 'Payment history', icon: History, action: () => onHistory(sub) },
    sub.status !== 'cancelled' && { label: 'Edit', icon: Pencil, action: () => onEdit(sub) },
    sub.status === 'active' && { label: 'Pause', icon: Pause, action: () => onStatus(sub, 'paused') },
    sub.status !== 'active' && { label: sub.status === 'cancelled' ? 'Re-activate' : 'Resume', icon: Play, action: () => onStatus(sub, 'active') },
    sub.status !== 'cancelled' && { label: 'Cancel subscription', icon: XCircle, action: () => onStatus(sub, 'cancelled'), danger: true },
    { label: 'Delete', icon: Trash2, action: () => onDelete(sub), danger: true },
  ].filter(Boolean);

  return (
    <li className={cn('flex flex-wrap items-center gap-3 py-3.5 first:pt-0 last:pb-0', sub.status !== 'active' && 'opacity-70')}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
        {createElement(categoryIcon(sub.category, 'expense'), { className: 'size-[18px]', 'aria-hidden': true })}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{sub.name}</p>
          {sub.status !== 'active' && <Badge tone={sub.status === 'cancelled' ? 'danger' : 'warning'}>{sub.status === 'cancelled' ? 'Cancelled' : 'Paused'}</Badge>}
          {sub.autoPay && sub.status === 'active' && <Badge tone="accent">Auto-pay</Badge>}
        </div>
        <p className="text-xs text-muted">
          {CYCLE_LABEL[sub.billingCycle]} · {sub.category}
          {sub.status === 'active' && ` · next ${formatShortDate(sub.nextDueDate)}`}
          {sub.status === 'cancelled' && sub.cancelledAt && ` · cancelled ${formatShortDate(sub.cancelledAt)}`}
          {sub.payments > 0 && ` · ${money(sub.totalPaid, { decimals: 0 })} paid so far`}
        </p>
      </div>
      <div className="text-right">
        <p className="tabular font-semibold">
          {sub.variableAmount && <span className="mr-0.5 text-xs font-normal text-muted">~</span>}
          {money(sub.amount, { decimals: 0 })}
        </p>
        {sub.billingCycle !== 'monthly' && <p className="tabular text-xs text-muted">{money(sub.monthlyCost, { decimals: 0 })}/mo</p>}
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
          aria-label={`Actions for ${sub.name}`}
          className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text"
        >
          <MoreHorizontal className="size-4" />
        </button>
        {menuOpen && (
          <div role="menu" className="absolute top-10 right-0 z-10 w-52 rounded-xl border border-border bg-surface p-1 shadow-card">
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
    </li>
  );
}

function HistoryModal({ subscription, money, onClose }) {
  return (
    <Modal open={Boolean(subscription)} onClose={onClose} title={subscription ? `${subscription.name} history` : ''}>
      {subscription && <HistoryContent id={subscription.id} money={money} />}
    </Modal>
  );
}

function HistoryContent({ id, money }) {
  const history = useAsync(() => subscriptionService.history(id), [id]);
  if (history.error) return <ErrorState error={history.error} onRetry={history.reload} />;
  if (!history.data) return <Skeleton className="h-40" />;
  const { items, totalPaid, payments } = history.data;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {payments} payment{payments === 1 ? '' : 's'} · <span className="tabular font-semibold text-text">{money(totalPaid, { decimals: 0 })}</span> in total
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted">No payments recorded yet.</p>
      ) : (
        <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto text-sm">
          {items.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2">
              <span>
                {formatDate(b.dueDate)}
                {b.status === 'skipped' && <span className="ml-2 text-xs text-muted">skipped</span>}
              </span>
              <span className="tabular font-medium">{b.status === 'paid' ? money(b.paidAmount, { decimals: 0 }) : '—'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
