import mongoose from 'mongoose';
import { Subscription } from '../models/Subscription.js';
import { Bill } from '../models/Bill.js';
import { Transaction } from '../models/Transaction.js';
import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { findOwnedOrThrow } from '../utils/ownership.js';
import { addDaysUtc, parseDateOnly, toDateOnly, todayUtc } from '../utils/dates.js';
import { roundMoney } from '../utils/money.js';
import { createTransaction } from './transactionService.js';
import { billState, daysUntil, monthlyCost, nextAfter, occurrencesUntil } from './finance/recurring.js';

export const GENERATION_HORIZON_DAYS = 62;

function oid(id) {
  return new mongoose.Types.ObjectId(String(id));
}

/** Adds computed display fields to a bill. */
function present(bill, today = todayUtc()) {
  const json = typeof bill.toJSON === 'function' ? bill.toJSON() : bill;
  return { ...json, state: billState(json, today), daysUntilDue: daysUntil(json.dueDate, today) };
}

/**
 * Makes sure every active subscription has a Bill for each occurrence from its
 * next due date up to ~2 months ahead. Idempotent (unique subscriptionId+dueDate).
 */
export async function ensureUpcomingBills(userId) {
  const until = addDaysUtc(todayUtc(), GENERATION_HORIZON_DAYS);
  const subscriptions = await Subscription.find({ userId, status: 'active' });
  const ops = [];
  for (const sub of subscriptions) {
    for (const dueDate of occurrencesUntil(sub.nextDueDate, sub.billingCycle, until)) {
      ops.push({
        updateOne: {
          filter: { subscriptionId: sub._id, dueDate },
          update: {
            $setOnInsert: {
              userId: oid(userId),
              subscriptionId: sub._id,
              name: sub.name,
              amount: sub.amount,
              estimated: sub.variableAmount,
              category: sub.category,
              paymentMethod: sub.paymentMethod,
              dueDate,
              status: 'upcoming',
              reminderDaysBefore: sub.reminderDaysBefore,
            },
          },
          upsert: true,
        },
      });
    }
  }
  if (ops.length) await Bill.bulkWrite(ops, { ordered: false });
}

/** Removes not-yet-paid bills of a subscription (after edits, pause or cancel). */
async function clearUpcoming(subscriptionId, { from } = {}) {
  const filter = { subscriptionId, status: 'upcoming' };
  if (from) filter.dueDate = { $gte: from };
  await Bill.deleteMany(filter);
}

// ---------- Subscriptions ----------

export async function listSubscriptions(userId) {
  const subscriptions = await Subscription.find({ userId }).sort({ status: 1, nextDueDate: 1 });
  const totals = await Bill.aggregate([
    { $match: { userId: oid(userId), status: 'paid', subscriptionId: { $ne: null } } },
    { $group: { _id: '$subscriptionId', totalPaid: { $sum: '$paidAmount' }, payments: { $sum: 1 }, lastPaid: { $max: '$paidAt' } } },
  ]);
  const byId = new Map(totals.map((t) => [t._id.toString(), t]));
  return subscriptions.map((s) => {
    const t = byId.get(s._id.toString());
    return {
      ...s.toJSON(),
      monthlyCost: monthlyCost(s.amount, s.billingCycle),
      yearlyCost: roundMoney(monthlyCost(s.amount, s.billingCycle) * 12),
      totalPaid: roundMoney(t?.totalPaid ?? 0),
      payments: t?.payments ?? 0,
      lastPaidAt: t?.lastPaid ?? null,
    };
  });
}

export async function createSubscription(userId, data) {
  const { nextDueDate, ...rest } = data;
  const sub = await Subscription.create({ ...rest, userId, nextDueDate: parseDateOnly(nextDueDate) });
  await ensureUpcomingBills(userId);
  return sub;
}

export async function updateSubscription(userId, id, changes) {
  const sub = await findOwnedOrThrow(Subscription, id, userId, { label: 'Subscription' });
  const { nextDueDate, status, ...rest } = changes;
  sub.set(rest);
  if (nextDueDate) sub.nextDueDate = parseDateOnly(nextDueDate);

  if (status && status !== sub.status) {
    sub.status = status;
    sub.cancelledAt = status === 'cancelled' ? new Date() : null;
    // Resuming: never leave the next due date in the past.
    if (status === 'active' && sub.nextDueDate < todayUtc()) {
      sub.nextDueDate = nextAfter(sub.nextDueDate, sub.billingCycle, addDaysUtc(todayUtc(), -1));
    }
  }
  await sub.save();

  // Schedule-affecting changes: regenerate unpaid bills from the new settings.
  const scheduleChanged = ['amount', 'billingCycle', 'category', 'paymentMethod', 'name', 'variableAmount', 'reminderDaysBefore'].some(
    (key) => key in rest,
  );
  if (scheduleChanged || nextDueDate || status) await clearUpcoming(sub._id);
  if (sub.status === 'active') await ensureUpcomingBills(userId);
  return sub;
}

/** Deletes a subscription. Paid history is kept (unlinked); unpaid bills are removed. */
export async function deleteSubscription(userId, id) {
  const sub = await findOwnedOrThrow(Subscription, id, userId, { label: 'Subscription' });
  await clearUpcoming(sub._id);
  await Bill.updateMany({ subscriptionId: sub._id }, { $set: { subscriptionId: null } });
  await sub.deleteOne();
}

export async function subscriptionHistory(userId, id) {
  const sub = await findOwnedOrThrow(Subscription, id, userId, { label: 'Subscription' });
  const bills = await Bill.find({ userId, subscriptionId: sub._id, status: { $in: ['paid', 'skipped'] } }).sort({ dueDate: -1 }).limit(60);
  const paid = bills.filter((b) => b.status === 'paid');
  return {
    subscription: sub,
    items: bills.map((b) => present(b)),
    totalPaid: roundMoney(paid.reduce((s, b) => s + (b.paidAmount ?? b.amount), 0)),
    payments: paid.length,
  };
}

// ---------- Bills ----------

export async function listBills(userId, { from, to, status }) {
  await ensureUpcomingBills(userId);
  const filter = { userId };
  if (from || to) {
    filter.dueDate = {};
    if (from) filter.dueDate.$gte = parseDateOnly(from);
    if (to) filter.dueDate.$lte = parseDateOnly(to);
  }
  if (status === 'unpaid') filter.status = 'upcoming';
  else if (status) filter.status = status;

  const today = todayUtc();
  const bills = await Bill.find(filter).sort({ dueDate: 1, name: 1 }).limit(500);
  return bills.map((b) => present(b, today));
}

export async function createOneOffBill(userId, data) {
  const bill = await Bill.create({ ...data, userId, subscriptionId: null, dueDate: parseDateOnly(data.dueDate), estimated: false });
  return present(bill);
}

/** Paid or skipped bills shouldn't keep nagging: remove their reminders right away. */
async function clearBillReminders(bill) {
  await Notification.deleteMany({ userId: bill.userId, dedupeKey: { $in: [`bill_due:${bill._id}`, `bill_overdue:${bill._id}`] } });
}

async function advanceSubscriptionPast(bill) {
  if (!bill.subscriptionId) return;
  const sub = await Subscription.findById(bill.subscriptionId);
  if (sub && sub.nextDueDate <= bill.dueDate) {
    sub.nextDueDate = nextAfter(sub.nextDueDate, sub.billingCycle, bill.dueDate);
    await sub.save();
  }
}

/** Marks a bill paid and records the expense transaction it represents. */
export async function payBill(userId, id, { amount, date, paymentMethod }) {
  const bill = await findOwnedOrThrow(Bill, id, userId, { label: 'Bill' });
  if (bill.status !== 'upcoming') throw ApiError.badRequest(`This bill is already ${bill.status}`);

  const paidAmount = amount ?? bill.amount;
  const paidOn = date ?? toDateOnly(todayUtc());
  const transaction = await createTransaction(
    userId,
    {
      type: 'expense',
      amount: paidAmount,
      category: bill.category,
      description: bill.name,
      paymentMethod: paymentMethod ?? bill.paymentMethod,
      date: paidOn,
      notes: `Bill due ${toDateOnly(bill.dueDate)}`,
    },
    { origin: 'bill' },
  );

  bill.status = 'paid';
  bill.paidAt = parseDateOnly(paidOn);
  bill.paidAmount = roundMoney(paidAmount);
  bill.transactionId = transaction._id;
  await bill.save();
  await advanceSubscriptionPast(bill);
  await clearBillReminders(bill);
  return { bill: present(bill), transaction };
}

export async function skipBill(userId, id) {
  const bill = await findOwnedOrThrow(Bill, id, userId, { label: 'Bill' });
  if (bill.status !== 'upcoming') throw ApiError.badRequest(`This bill is already ${bill.status}`);
  bill.status = 'skipped';
  await bill.save();
  await advanceSubscriptionPast(bill);
  await clearBillReminders(bill);
  return present(bill);
}

/** Undo a payment or skip: removes the recorded expense and re-opens the bill. */
export async function reopenBill(userId, id) {
  const bill = await findOwnedOrThrow(Bill, id, userId, { label: 'Bill' });
  if (bill.status === 'upcoming') return present(bill);
  if (bill.transactionId) await Transaction.deleteOne({ _id: bill.transactionId, userId });
  bill.status = 'upcoming';
  bill.paidAt = null;
  bill.paidAmount = null;
  bill.transactionId = null;
  await bill.save();

  if (bill.subscriptionId) {
    const sub = await Subscription.findById(bill.subscriptionId);
    if (sub && sub.nextDueDate > bill.dueDate) {
      sub.nextDueDate = bill.dueDate;
      await sub.save();
    }
  }
  return present(bill);
}

export async function deleteBill(userId, id) {
  const bill = await findOwnedOrThrow(Bill, id, userId, { label: 'Bill' });
  if (bill.subscriptionId) throw ApiError.badRequest('Bills from a subscription can be skipped, not deleted');
  if (bill.status === 'paid') throw ApiError.badRequest('Undo the payment before deleting this bill');
  await bill.deleteOne();
}

export async function billsSummary(userId) {
  await ensureUpcomingBills(userId);
  const today = todayUtc();
  const in30 = addDaysUtc(today, 30);
  const [subscriptions, unpaid] = await Promise.all([
    Subscription.find({ userId, status: 'active' }),
    Bill.find({ userId, status: 'upcoming', dueDate: { $lte: in30 } }).sort({ dueDate: 1 }),
  ]);

  const monthly = roundMoney(subscriptions.reduce((s, sub) => s + monthlyCost(sub.amount, sub.billingCycle), 0));
  const overdue = unpaid.filter((b) => b.dueDate < today);
  const upcoming = unpaid.filter((b) => b.dueDate >= today);
  const byCategory = {};
  for (const sub of subscriptions) byCategory[sub.category] = roundMoney((byCategory[sub.category] ?? 0) + monthlyCost(sub.amount, sub.billingCycle));

  return {
    activeCount: subscriptions.length,
    monthlyCost: monthly,
    yearlyCost: roundMoney(monthly * 12),
    byCategory: Object.entries(byCategory).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    next30Days: { count: upcoming.length, total: roundMoney(upcoming.reduce((s, b) => s + b.amount, 0)) },
    overdue: { count: overdue.length, total: roundMoney(overdue.reduce((s, b) => s + b.amount, 0)) },
    nextBills: unpaid.slice(0, 6).map((b) => present(b, today)),
  };
}
