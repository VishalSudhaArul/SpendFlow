/**
 * Shared aggregation queries for the dashboard and analytics. Every query is
 * scoped to one user with a $match on userId as its first stage.
 */
import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { roundMoney } from '../utils/money.js';
import { monthBounds, shiftMonth } from './finance/planning.js';

export function oid(id) {
  return new mongoose.Types.ObjectId(String(id));
}

/** Income and expense totals per month for `count` months ending at `lastMonth` (inclusive). */
export async function monthlyTotals(userId, lastMonth, count) {
  const firstMonth = shiftMonth(lastMonth, -(count - 1));
  const rows = await Transaction.aggregate([
    {
      $match: {
        userId: oid(userId),
        date: { $gte: monthBounds(firstMonth).start, $lt: monthBounds(lastMonth).end },
      },
    },
    {
      $group: {
        _id: { month: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } }, type: '$type' },
        total: { $sum: '$amount' },
      },
    },
  ]);
  const months = Array.from({ length: count }, (_, i) => shiftMonth(firstMonth, i));
  const map = new Map(months.map((month) => [month, { month, income: 0, expense: 0 }]));
  for (const row of rows) {
    const bucket = map.get(row._id.month);
    if (bucket) bucket[row._id.type] = roundMoney(row.total);
  }
  return months.map((month) => {
    const m = map.get(month);
    return { ...m, net: roundMoney(m.income - m.expense) };
  });
}

/** Expense totals by category between two dates (end exclusive). */
export async function expensesByCategory(userId, start, end) {
  const rows = await Transaction.aggregate([
    { $match: { userId: oid(userId), type: 'expense', date: { $gte: start, $lt: end } } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, { total: roundMoney(row.total), count: row.count }]));
}

/** { [category]: [m1, m2, ...] } monthly expense totals for the given months. */
export async function categoryMonthMatrix(userId, months) {
  const rows = await Transaction.aggregate([
    {
      $match: {
        userId: oid(userId),
        type: 'expense',
        date: { $gte: monthBounds(months[0]).start, $lt: monthBounds(months.at(-1)).end },
      },
    },
    {
      $group: {
        _id: { category: '$category', month: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } } },
        total: { $sum: '$amount' },
      },
    },
  ]);
  const matrix = {};
  for (const row of rows) {
    matrix[row._id.category] ??= months.map(() => 0);
    const index = months.indexOf(row._id.month);
    if (index >= 0) matrix[row._id.category][index] = roundMoney(row.total);
  }
  return matrix;
}

export async function allTimeTotals(userId) {
  const rows = await Transaction.aggregate([
    { $match: { userId: oid(userId) } },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const byType = Object.fromEntries(rows.map((r) => [r._id, r]));
  const income = roundMoney(byType.income?.total ?? 0);
  const expense = roundMoney(byType.expense?.total ?? 0);
  return {
    income,
    expense,
    balance: roundMoney(income - expense),
    transactionCount: (byType.income?.count ?? 0) + (byType.expense?.count ?? 0),
  };
}

/** Expenses (lean) between two dates, for anomaly detection. */
export function expensesBetween(userId, start, end) {
  return Transaction.find(
    { userId: oid(userId), type: 'expense', date: { $gte: start, $lt: end } },
    { amount: 1, category: 1, date: 1, description: 1, paymentMethod: 1 },
  )
    .sort({ date: -1 })
    .lean();
}
