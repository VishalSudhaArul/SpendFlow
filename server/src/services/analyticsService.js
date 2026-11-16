import { Transaction } from '../models/Transaction.js';
import { IncomeSource } from '../models/IncomeSource.js';
import { ApiError } from '../utils/ApiError.js';
import { roundMoney } from '../utils/money.js';
import { addDaysUtc, addMonthsUtc, monthKey, parseDateOnly, startOfMonthUtc, toDateOnly, todayUtc } from '../utils/dates.js';
import { median, shiftMonth } from './finance/planning.js';
import { detectUnusual, projectCashFlow, savingsRate } from './finance/intelligence.js';
import { monthlyEquivalent } from './incomeService.js';
import { allTimeTotals, expensesBetween, monthlyTotals, oid } from './analyticsData.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BUCKETS = 400;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Turns a preset ("30d", "6m", "ytd"…) or a custom from/to into a UTC date
 * range [start, end) plus a sensible bucket size.
 */
export function resolveRange({ range = '30d', from, to, granularity }, today = todayUtc()) {
  const end = addDaysUtc(today, 1);
  let start;
  switch (range) {
    case '7d':
      start = addDaysUtc(today, -6);
      break;
    case '30d':
      start = addDaysUtc(today, -29);
      break;
    case '90d':
      start = addDaysUtc(today, -89);
      break;
    case '6m':
      start = addMonthsUtc(startOfMonthUtc(today), -5);
      break;
    case '12m':
      start = addMonthsUtc(startOfMonthUtc(today), -11);
      break;
    case 'ytd':
      start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      break;
    case 'custom': {
      if (!from || !to) throw ApiError.badRequest('Custom ranges need both "from" and "to" dates');
      start = parseDateOnly(from);
      const customEnd = addDaysUtc(parseDateOnly(to), 1);
      return finalize(start, customEnd, granularity, range);
    }
    default:
      throw ApiError.badRequest('Unknown range');
  }
  return finalize(start, end, granularity, range);
}

function finalize(start, end, granularity, range) {
  const days = Math.round((end - start) / DAY_MS);
  if (days < 1) throw ApiError.badRequest('The date range is empty');
  if (days > 366 * 5) throw ApiError.badRequest('Ranges are limited to 5 years');

  const auto = days <= 31 ? 'day' : days <= 120 ? 'week' : days <= 1100 ? 'month' : 'year';
  let unit = granularity ?? auto;
  const bucketCount = { day: days, week: Math.ceil(days / 7) + 1, month: Math.ceil(days / 28) + 1, year: Math.ceil(days / 365) + 1 }[unit];
  if (bucketCount > MAX_BUCKETS) unit = auto;

  return {
    range,
    start,
    end,
    days,
    granularity: unit,
    previous: { start: new Date(start.getTime() - days * DAY_MS), end: start },
  };
}

/** Start of the bucket that contains `date` (weeks start on Monday). */
export function truncate(date, unit) {
  const d = new Date(date);
  if (unit === 'day') return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (unit === 'week') {
    const day = (d.getUTCDay() + 6) % 7; // Monday = 0
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  }
  if (unit === 'month') return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

export function bucketKeys(start, end, unit) {
  const keys = [];
  let cursor = truncate(start, unit);
  while (cursor < end && keys.length <= MAX_BUCKETS) {
    keys.push(toDateOnly(cursor));
    if (unit === 'day') cursor = addDaysUtc(cursor, 1);
    else if (unit === 'week') cursor = addDaysUtc(cursor, 7);
    else if (unit === 'month') cursor = addMonthsUtc(cursor, 1);
    else cursor = addMonthsUtc(cursor, 12);
  }
  return keys;
}

async function periodTotals(userId, start, end) {
  const rows = await Transaction.aggregate([
    { $match: { userId: oid(userId), date: { $gte: start, $lt: end } } },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const byType = Object.fromEntries(rows.map((r) => [r._id, r]));
  const income = roundMoney(byType.income?.total ?? 0);
  const expense = roundMoney(byType.expense?.total ?? 0);
  return {
    income,
    expense,
    net: roundMoney(income - expense),
    savingsRate: savingsRate(income, expense),
    transactionCount: (byType.income?.count ?? 0) + (byType.expense?.count ?? 0),
  };
}

function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function getAnalyticsOverview(userId, query) {
  const r = resolveRange(query);
  const uid = oid(userId);
  const match = { userId: uid, date: { $gte: r.start, $lt: r.end } };

  const [totals, previous, seriesRows, categoryRows, prevCategoryRows, methodRows, weekdayRows, merchantRows] = await Promise.all([
    periodTotals(userId, r.start, r.end),
    periodTotals(userId, r.previous.start, r.previous.end),
    Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { bucket: { $dateTrunc: { date: '$date', unit: r.granularity, startOfWeek: 'monday', timezone: 'UTC' } }, type: '$type' },
          total: { $sum: '$amount' },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { ...match, type: 'expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Transaction.aggregate([
      { $match: { userId: uid, type: 'expense', date: { $gte: r.previous.start, $lt: r.previous.end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { ...match, type: 'expense' } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Transaction.aggregate([
      { $match: { ...match, type: 'expense' } },
      { $group: { _id: { $dayOfWeek: { date: '$date', timezone: 'UTC' } }, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { ...match, type: 'expense' } },
      { $group: { _id: { $toLower: '$description' }, name: { $first: '$description' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 6 },
    ]),
  ]);

  const keys = bucketKeys(r.start, r.end, r.granularity);
  const series = new Map(keys.map((key) => [key, { bucket: key, income: 0, expense: 0 }]));
  for (const row of seriesRows) {
    const bucket = series.get(toDateOnly(row._id.bucket));
    if (bucket) bucket[row._id.type] = roundMoney(row.total);
  }

  const prevByCategory = new Map(prevCategoryRows.map((row) => [row._id, row.total]));
  const categories = categoryRows.map((row) => ({
    category: row._id,
    total: roundMoney(row.total),
    count: row.count,
    share: totals.expense ? Math.round((row.total / totals.expense) * 1000) / 10 : 0,
    previous: roundMoney(prevByCategory.get(row._id) ?? 0),
    change: percentChange(row.total, prevByCategory.get(row._id) ?? 0),
  }));

  // Average spend per weekday = total on that weekday ÷ how many of that weekday the range contains.
  const weekdayCounts = Array(7).fill(0);
  for (let d = new Date(r.start); d < r.end; d = addDaysUtc(d, 1)) weekdayCounts[d.getUTCDay()] += 1;
  const weekdayTotals = new Map(weekdayRows.map((row) => [row._id - 1, row.total]));
  const weekdays = [1, 2, 3, 4, 5, 6, 0].map((i) => ({
    day: WEEKDAYS[i],
    average: weekdayCounts[i] ? roundMoney((weekdayTotals.get(i) ?? 0) / weekdayCounts[i]) : 0,
  }));

  return {
    range: { key: r.range, from: toDateOnly(r.start), to: toDateOnly(addDaysUtc(r.end, -1)), days: r.days, granularity: r.granularity },
    totals: { ...totals, avgDailySpend: roundMoney(totals.expense / r.days) },
    previous: {
      ...previous,
      from: toDateOnly(r.previous.start),
      to: toDateOnly(addDaysUtc(r.previous.end, -1)),
    },
    change: {
      income: percentChange(totals.income, previous.income),
      expense: percentChange(totals.expense, previous.expense),
      // Net can be negative or flip sign, where a percentage is meaningless: report the amount difference.
      netAmount: roundMoney(totals.net - previous.net),
    },
    series: [...series.values()].map((b) => ({ ...b, net: roundMoney(b.income - b.expense) })),
    categories,
    paymentMethods: methodRows.map((row) => ({
      method: row._id,
      total: roundMoney(row.total),
      count: row.count,
      share: totals.expense ? Math.round((row.total / totals.expense) * 1000) / 10 : 0,
    })),
    weekdays,
    topMerchants: merchantRows.map((row) => ({ name: row.name, total: roundMoney(row.total), count: row.count })),
  };
}

/** Daily spending totals for a calendar heatmap (default: last 365 days). */
export async function getHeatmap(userId, { days = 365 } = {}) {
  const today = todayUtc();
  const start = addDaysUtc(today, -(days - 1));
  const rows = await Transaction.aggregate([
    { $match: { userId: oid(userId), type: 'expense', date: { $gte: start, $lt: addDaysUtc(today, 1) } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const totals = rows.map((r) => r.total);
  return {
    from: toDateOnly(start),
    to: toDateOnly(today),
    days: rows.map((r) => ({ date: r._id, total: roundMoney(r.total), count: r.count })),
    // Bucket edges so every client colours the same way: quartiles of spending days.
    thresholds: totals.length ? [0.25, 0.5, 0.75, 0.95].map((q) => roundMoney(quantile(totals, q))) : [],
  };
}

function quantile(values, q) {
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

/** Unusual expenses in the last `days` days, judged against the year before them. */
export async function getUnusualExpenses(userId, { days = 90 } = {}) {
  const today = todayUtc();
  const windowStart = addDaysUtc(today, -(days - 1));
  const [candidates, history] = await Promise.all([
    expensesBetween(userId, windowStart, addDaysUtc(today, 1)),
    expensesBetween(userId, addDaysUtc(windowStart, -365), windowStart),
  ]);
  // Earlier expenses inside the window also count as history for later ones.
  const pool = [...history, ...candidates];
  const items = detectUnusual(
    candidates.map((t) => ({ id: t._id.toString(), amount: t.amount, category: t.category, date: t.date, description: t.description })),
    pool.map((t) => ({ amount: t.amount, category: t.category })),
  );
  return { days, items, historySize: pool.length };
}

/** Next N months of projected income, spending and running balance. */
export async function getCashFlowProjection(userId, { months = 6 } = {}) {
  const today = todayUtc();
  const current = monthKey(today);
  const lastCompleted = shiftMonth(current, -1);
  const [history, totals, sources] = await Promise.all([
    monthlyTotals(userId, lastCompleted, 3),
    allTimeTotals(userId),
    IncomeSource.find({ userId, isActive: true }),
  ]);

  const expected = roundMoney(sources.reduce((sum, s) => sum + monthlyEquivalent(s), 0));
  const withIncome = history.filter((m) => m.income > 0);
  const avgIncome = withIncome.length ? withIncome.reduce((s, m) => s + m.income, 0) / withIncome.length : 0;
  const spendMonths = history.filter((m) => m.expense > 0).map((m) => m.expense);

  const monthlyIncome = expected > 0 ? expected : avgIncome;
  const monthlyExpense = median(spendMonths);
  const enoughData = spendMonths.length >= 1 && monthlyIncome > 0;

  return {
    basis: {
      income: expected > 0 ? 'income_sources' : withIncome.length ? 'recent_average' : 'none',
      expense: spendMonths.length ? `median_of_${spendMonths.length}_months` : 'none',
    },
    enoughData,
    startBalance: totals.balance,
    months: enoughData
      ? projectCashFlow({
          startBalance: totals.balance,
          monthlyIncome,
          monthlyExpense,
          months,
          monthKeys: Array.from({ length: months }, (_, i) => shiftMonth(current, i + 1)),
        })
      : [],
  };
}
