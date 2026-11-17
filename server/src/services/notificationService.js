/**
 * In-app notifications.
 *
 * Event-driven notifications (a goal reached) are created when they happen.
 * State-driven ones (bill due soon, bill overdue, budget over/near its limit,
 * an unusual expense) are derived from current data by `syncNotifications`,
 * which runs when the user opens their notifications. Each has a dedupe key,
 * so it is created once and its read/unread state is preserved.
 */
import { Notification } from '../models/Notification.js';
import { Bill } from '../models/Bill.js';
import { findOwnedOrThrow } from '../utils/ownership.js';
import { addDaysUtc, monthKey, toDateOnly, todayUtc } from '../utils/dates.js';
import { ensureUpcomingBills } from './billService.js';
import { getBudgetOverview } from './budgetService.js';
import { getUnusualExpenses } from './analyticsService.js';

const KEEP_DAYS = 90;
const SYNC_INTERVAL_MS = 60 * 1000;
const lastSync = new Map(); // userId -> timestamp (avoid re-syncing on every poll)
const shortDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function formatMoney(amount, currency = 'INR') {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

async function upsertNotification(userId, notification) {
  await Notification.updateOne(
    { userId, dedupeKey: notification.dedupeKey },
    { $setOnInsert: { ...notification, userId, readAt: null, expiresAt: addDaysUtc(new Date(), KEEP_DAYS) } },
    { upsert: true },
  );
}

/** Derives notifications from current bills, budgets and spending. */
export async function syncNotifications(user, { force = false } = {}) {
  const userId = user._id;
  const key = userId.toString();
  if (!force && Date.now() - (lastSync.get(key) ?? 0) < SYNC_INTERVAL_MS) return;
  lastSync.set(key, Date.now());

  const money = (n) => formatMoney(n, user.currency);
  const today = todayUtc();
  await ensureUpcomingBills(userId);

  const [bills, budgets, unusual] = await Promise.all([
    Bill.find({ userId, status: 'upcoming', dueDate: { $lte: addDaysUtc(today, 14) } }),
    getBudgetOverview(userId, monthKey(today)),
    getUnusualExpenses(userId, { days: 30 }),
  ]);

  const tasks = [];
  for (const bill of bills) {
    const daysLeft = Math.round((bill.dueDate - today) / 86_400_000);
    const due = shortDate.format(bill.dueDate);
    if (daysLeft < 0) {
      tasks.push(
        upsertNotification(userId, {
          type: 'bill_overdue',
          severity: 'critical',
          title: `${bill.name} is overdue`,
          message: `${money(bill.amount)} was due on ${due}. Mark it paid or skip it if it's settled.`,
          link: '/bills',
          dedupeKey: `bill_overdue:${bill._id}`,
        }),
      );
    } else if (daysLeft <= bill.reminderDaysBefore) {
      tasks.push(
        upsertNotification(userId, {
          type: 'bill_due',
          severity: 'warning',
          title: daysLeft === 0 ? `${bill.name} is due today` : `${bill.name} is due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
          message: `${money(bill.amount)}${bill.estimated ? ' (estimated)' : ''} due on ${due}.`,
          link: '/bills',
          dedupeKey: `bill_due:${bill._id}`,
        }),
      );
    }
  }

  for (const alert of budgets.alerts) {
    const label = alert.category ?? 'Overall';
    const over = alert.status === 'over';
    tasks.push(
      upsertNotification(userId, {
        type: over ? 'budget_over' : 'budget_warning',
        severity: over ? 'critical' : 'warning',
        title: over ? `${label} budget exceeded` : `${label} budget is running low`,
        message: over
          ? `You've spent ${money(alert.spent)} of ${money(alert.limit)} this month.`
          : alert.reason === 'on_pace_to_exceed'
            ? `At this pace you'll spend about ${money(alert.projected)} of ${money(alert.limit)}.`
            : `${money(alert.spent)} of ${money(alert.limit)} used so far.`,
        link: '/budgets',
        // One notification per budget, month and level (a later "over" still notifies after a "warning").
        dedupeKey: `${over ? 'budget_over' : 'budget_warning'}:${alert.budgetId}:${budgets.month}`,
      }),
    );
  }

  for (const item of unusual.items) {
    tasks.push(
      upsertNotification(userId, {
        type: 'unusual_expense',
        severity: 'info',
        title: `Unusual ${item.category} expense`,
        message: `${item.description}: ${money(item.amount)} — ${item.explanation}.`,
        link: '/analytics',
        dedupeKey: `unusual:${item.id}`,
      }),
    );
  }

  await Promise.all(tasks);

  // Remove alerts that are no longer true (bill paid/skipped, budget raised…),
  // so the bell never nags about something already handled.
  const activeKeys = [
    ...bills.map((b) => (b.dueDate < today ? `bill_overdue:${b._id}` : `bill_due:${b._id}`)),
    ...budgets.alerts.map((a) => `${a.status === 'over' ? 'budget_over' : 'budget_warning'}:${a.budgetId}:${budgets.month}`),
  ];
  await Notification.deleteMany({
    userId,
    type: { $in: ['bill_due', 'bill_overdue', 'budget_warning', 'budget_over'] },
    dedupeKey: { $nin: activeKeys },
  });
}

export async function notifyGoalReached(userId, goal) {
  await upsertNotification(userId, {
    type: 'goal_reached',
    severity: 'info',
    title: `🎉 ${goal.name} reached!`,
    message: 'You hit your savings target. Time to set the next one?',
    link: '/goals',
    dedupeKey: `goal_reached:${goal._id ?? goal.id}:${toDateOnly(todayUtc())}`,
  });
}

export async function listNotifications(user, { unreadOnly, limit }) {
  await syncNotifications(user);
  const filter = { userId: user._id };
  if (unreadOnly) filter.readAt = null;
  const [items, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ readAt: 1, createdAt: -1 }).limit(limit),
    Notification.countDocuments({ userId: user._id, readAt: null }),
  ]);
  return { items, unreadCount };
}

export async function markRead(userId, id) {
  const notification = await findOwnedOrThrow(Notification, id, userId, { label: 'Notification' });
  notification.readAt ??= new Date();
  await notification.save();
  return notification;
}

export async function markAllRead(userId) {
  const result = await Notification.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
  return { updated: result.modifiedCount };
}

export async function deleteNotification(userId, id) {
  const notification = await findOwnedOrThrow(Notification, id, userId, { label: 'Notification' });
  await notification.deleteOne();
}

export function _resetSyncCache() {
  lastSync.clear();
}
