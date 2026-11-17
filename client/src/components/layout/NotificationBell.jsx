import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { AlertTriangle, Bell, BellRing, CheckCheck, Info, PartyPopper, XCircle } from 'lucide-react';
import { notificationService } from '../../services/financeServices.js';
import { cn } from '../../utils/cn.js';

const POLL_MS = 2 * 60 * 1000;
const ICONS = {
  bill_due: { icon: BellRing, className: 'text-warning' },
  bill_overdue: { icon: XCircle, className: 'text-danger' },
  budget_warning: { icon: AlertTriangle, className: 'text-warning' },
  budget_over: { icon: XCircle, className: 'text-danger' },
  goal_reached: { icon: PartyPopper, className: 'text-success' },
  unusual_expense: { icon: Info, className: 'text-accent-ink' },
};

const timeAgo = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
function relative(date) {
  const minutes = Math.round((new Date(date) - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) return timeAgo.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return timeAgo.format(hours, 'hour');
  return timeAgo.format(Math.round(hours / 24), 'day');
}

/** Bell with unread count; opens a panel of recent notifications. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unreadCount: 0 });
  const [error, setError] = useState(false);
  const containerRef = useRef(null);
  const { pathname } = useLocation();

  const load = useCallback(() => {
    notificationService
      .list({ limit: 20 })
      .then((result) => {
        setData(result);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  // Refresh on navigation and every couple of minutes.
  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load, pathname]);

  // Pages fire this after actions that change notifications (paying a bill, etc.).
  useEffect(() => {
    window.addEventListener('spendflow:notifications', load);
    return () => window.removeEventListener('spendflow:notifications', load);
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => !containerRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function markRead(item) {
    if (item.readAt) return;
    setData((d) => ({ unreadCount: Math.max(0, d.unreadCount - 1), items: d.items.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n)) }));
    notificationService.read(item.id).catch(load);
  }

  async function markAll() {
    setData((d) => ({ unreadCount: 0, items: d.items.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) }));
    notificationService.readAll().catch(load);
  }

  const unread = data.unreadCount;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative grid size-10 place-items-center rounded-xl border border-border bg-surface text-muted transition hover:text-text"
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="tabular absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-3 top-16 z-40 overflow-hidden rounded-2xl border border-border bg-surface shadow-card sm:absolute sm:inset-x-auto sm:top-12 sm:right-0 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="flex items-center gap-1 text-xs font-semibold text-accent-ink hover:underline">
                <CheckCheck className="size-3.5" aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
            {error && <li className="px-4 py-6 text-center text-sm text-muted">Couldn't load notifications.</li>}
            {!error && data.items.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">You're all caught up.</li>}
            {data.items.map((n) => {
              const { icon: Icon, className } = ICONS[n.type] ?? ICONS.unusual_expense;
              const body = (
                <>
                  <Icon className={cn('mt-0.5 size-4 shrink-0', className)} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm', !n.readAt && 'font-semibold')}>{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{n.message}</p>
                    <p className="mt-1 text-[11px] text-muted">{relative(n.createdAt)}</p>
                  </div>
                  {!n.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                </>
              );
              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link
                      to={n.link}
                      onClick={() => {
                        markRead(n);
                        setOpen(false);
                      }}
                      className="flex gap-3 px-4 py-3 hover:bg-surface-2"
                    >
                      {body}
                    </Link>
                  ) : (
                    <button type="button" onClick={() => markRead(n)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-surface-2">
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
