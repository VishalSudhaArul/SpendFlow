import mongoose from 'mongoose';
import { Budget } from '../models/Budget.js';
import { FIXED_CATEGORIES } from '../constants/finance.js';
import { Transaction } from '../models/Transaction.js';
import { IncomeSource } from '../models/IncomeSource.js';
import { ApiError } from '../utils/ApiError.js';
import { findOwnedOrThrow } from '../utils/ownership.js';
import { monthKey, todayUtc } from '../utils/dates.js';
import { roundMoney } from '../utils/money.js';
import { monthlyEquivalent } from './incomeService.js';
import {
  budgetProgress,
  fiftyThirtyTwenty,
  monthBounds,
  monthPace,
  recommendBudgets,
  shiftMonth,
} from './finance/planning.js';

const HISTORY_MONTHS = 3;

function oid(id) {
  return new mongoose.Types.ObjectId(String(id));
}

/** Expense totals per category for one month. */
async function spendingByCategory(userId, key) {
  const { start, end } = monthBounds(key);
  const rows = await Transaction.aggregate([
    { $match: { userId: oid(userId), type: 'expense', date: { $gte: start, $lt: end } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
  ]);
  return new Map(rows.map((row) => [row._id, roundMoney(row.total)]));
}

/** { [category]: [month1, month2, month3] } for the N completed months before `key`. */
async function categoryHistory(userId, key, months = HISTORY_MONTHS) {
  const firstMonth = shiftMonth(key, -months);
  const { start } = monthBounds(firstMonth);
  const { start: end } = monthBounds(key);

  const rows = await Transaction.aggregate([
    { $match: { userId: oid(userId), type: 'expense', date: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { category: '$category', month: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } } },
        total: { $sum: '$amount' },
      },
    },
  ]);

  const monthKeys = Array.from({ length: months }, (_, i) => shiftMonth(firstMonth, i));
  const history = {};
  for (const row of rows) {
    history[row._id.category] ??= monthKeys.map(() => 0);
    history[row._id.category][monthKeys.indexOf(row._id.month)] = roundMoney(row.total);
  }
  return { history, months: monthKeys };
}

export async function getBudgetOverview(userId, key) {
  const today = todayUtc();
  const pace = monthPace(key, today);
  const [budgets, spending] = await Promise.all([
    Budget.find({ userId, month: key }).sort({ category: 1 }),
    spendingByCategory(userId, key),
  ]);

  const totalSpent = roundMoney([...spending.values()].reduce((sum, value) => sum + value, 0));
  const overallDoc = budgets.find((b) => b.category === null);
  const categoryDocs = budgets.filter((b) => b.category !== null);

  // Fixed monthly costs are counted once in projections, not extrapolated per day.
  const fixedSpent = roundMoney(FIXED_CATEGORIES.reduce((sum, category) => sum + (spending.get(category) ?? 0), 0));

  const overall = overallDoc
    ? {
        ...overallDoc.toJSON(),
        ...budgetProgress(
          { spent: totalSpent, limit: overallDoc.limit, alertThreshold: overallDoc.alertThreshold, fixedSpent },
          pace,
        ),
      }
    : null;

  const categories = categoryDocs
    .map((doc) => {
      const spent = spending.get(doc.category) ?? 0;
      return {
        ...doc.toJSON(),
        ...budgetProgress(
          {
            spent,
            limit: doc.limit,
            alertThreshold: doc.alertThreshold,
            fixedSpent: FIXED_CATEGORIES.includes(doc.category) ? spent : 0,
          },
          pace,
        ),
      };
    })
    .sort((a, b) => b.percent - a.percent);

  const budgeted = new Set(categoryDocs.map((b) => b.category));
  const unbudgeted = [...spending.entries()]
    .filter(([category]) => !budgeted.has(category))
    .map(([category, spent]) => ({ category, spent }))
    .sort((a, b) => b.spent - a.spent);

  const totalCategoryLimits = roundMoney(categoryDocs.reduce((sum, b) => sum + b.limit, 0));

  // Alerts the UI shows prominently. Each carries a reason so the text is explainable.
  const alerts = [overall, ...categories]
    .filter((b) => b && b.status !== 'ok')
    .map((b) => ({
      budgetId: b.id,
      category: b.category,
      status: b.status,
      reason: b.reason,
      spent: b.spent,
      limit: b.limit,
      projected: b.projected,
    }));

  return {
    month: key,
    pace,
    totalSpent,
    overall,
    categories,
    unbudgeted,
    totalCategoryLimits,
    alerts,
  };
}

export async function upsertBudget(userId, { month, category = null, limit, alertThreshold }) {
  const update = { limit };
  if (alertThreshold !== undefined) update.alertThreshold = alertThreshold;
  return Budget.findOneAndUpdate(
    { userId, month, category },
    { $set: update, $setOnInsert: { userId, month, category } },
    { upsert: true, new: true, runValidators: true },
  );
}

export async function updateBudget(userId, id, changes) {
  const budget = await findOwnedOrThrow(Budget, id, userId, { label: 'Budget' });
  budget.set(changes);
  await budget.save();
  return budget;
}

export async function deleteBudget(userId, id) {
  const budget = await findOwnedOrThrow(Budget, id, userId, { label: 'Budget' });
  await budget.deleteOne();
}

/** Upserts several budgets for a month at once (used by "apply recommendations" / 50-30-20). */
export async function bulkUpsertBudgets(userId, { month, items }) {
  const ops = items.map(({ category = null, limit }) => ({
    updateOne: {
      filter: { userId: oid(userId), month, category },
      update: { $set: { limit: roundMoney(limit) }, $setOnInsert: { userId: oid(userId), month, category } },
      upsert: true,
    },
  }));
  if (ops.length) await Budget.bulkWrite(ops, { ordered: false });
  return Budget.find({ userId, month });
}

/** Copies every budget from one month into another, skipping ones that already exist there. */
export async function copyBudgets(userId, { fromMonth, toMonth }) {
  if (fromMonth === toMonth) throw ApiError.badRequest('Choose two different months');
  const source = await Budget.find({ userId, month: fromMonth });
  if (source.length === 0) throw ApiError.notFound(`No budgets found for ${fromMonth}`);

  const existing = new Set((await Budget.find({ userId, month: toMonth })).map((b) => b.category ?? '__overall__'));
  const toCreate = source
    .filter((b) => !existing.has(b.category ?? '__overall__'))
    .map((b) => ({ userId, month: toMonth, category: b.category, limit: b.limit, alertThreshold: b.alertThreshold }));

  if (toCreate.length) await Budget.insertMany(toCreate);
  return { copied: toCreate.length, skipped: source.length - toCreate.length };
}

export async function getRecommendations(userId, key) {
  const [{ history, months }, budgets] = await Promise.all([
    categoryHistory(userId, key),
    Budget.find({ userId, month: key, category: { $ne: null } }),
  ]);
  const currentLimits = Object.fromEntries(budgets.map((b) => [b.category, b.limit]));
  return {
    basedOnMonths: months,
    items: recommendBudgets(history, { currentLimits }),
  };
}

/**
 * Monthly income used for the 50/30/20 plan, in order of preference:
 *  1. an amount the user typed in,
 *  2. expected income from active recurring sources,
 *  3. average income actually received over the last 3 completed months.
 */
async function resolveMonthlyIncome(userId, key, override) {
  if (override) return { amount: override, basis: 'provided' };

  const sources = await IncomeSource.find({ userId, isActive: true });
  const expected = roundMoney(sources.reduce((sum, s) => sum + monthlyEquivalent(s), 0));
  if (expected > 0) return { amount: expected, basis: 'income_sources' };

  const { start } = monthBounds(shiftMonth(key, -HISTORY_MONTHS));
  const { start: end } = monthBounds(key);
  const [row] = await Transaction.aggregate([
    { $match: { userId: oid(userId), type: 'income', date: { $gte: start, $lt: end } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const average = roundMoney((row?.total ?? 0) / HISTORY_MONTHS);
  if (average > 0) return { amount: average, basis: 'recent_income' };

  return { amount: 0, basis: 'none' };
}

export async function getFiftyThirtyTwenty(userId, key, { income } = {}) {
  const [{ amount, basis }, { history, months }] = await Promise.all([
    resolveMonthlyIncome(userId, key, income),
    categoryHistory(userId, key),
  ]);
  if (amount <= 0) {
    throw new ApiError(422, 'Add your monthly income to generate a 50/30/20 plan', {
      code: 'INCOME_REQUIRED',
      details: [{ location: 'query', path: 'income', message: 'Enter your monthly income' }],
    });
  }
  return { month: key, incomeBasis: basis, basedOnMonths: months, ...fiftyThirtyTwenty(amount, history) };
}

export function currentMonthKey() {
  return monthKey(todayUtc());
}
