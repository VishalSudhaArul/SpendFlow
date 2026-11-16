/**
 * Builds the ONLY data the AI ever sees: a compact, aggregated summary
 * computed by the server's finance engine.
 *
 * Deliberately excluded: the user's name, email, password hash, session
 * tokens, database ids, transaction descriptions and notes (which may contain
 * names of people or places), and income source names (often an employer).
 * Gemini never queries MongoDB; it only receives this object.
 */
import { getDashboard } from '../dashboardService.js';
import { categoryMonthMatrix } from '../analyticsData.js';
import { IncomeSource } from '../../models/IncomeSource.js';
import { monthlyEquivalent } from '../incomeService.js';
import { shiftMonth } from '../finance/planning.js';

// The AI gets whole-unit amounts: paise add noise, not insight, and models
// tend to repeat whatever precision they are given.
const r = (value) => (value === null || value === undefined ? null : Math.round(value));

export async function buildFinancialContext(user) {
  const userId = user._id;
  const dashboard = await getDashboard(userId);
  const months = Array.from({ length: 3 }, (_, i) => shiftMonth(dashboard.month, -(3 - i)));
  const [matrix, sources] = await Promise.all([categoryMonthMatrix(userId, months), IncomeSource.find({ userId, isActive: true })]);

  const typicalByCategory = Object.entries(matrix)
    .map(([category, values]) => ({ category, monthlyAverage: r(values.reduce((s, v) => s + v, 0) / values.length) }))
    .sort((a, b) => b.monthlyAverage - a.monthlyAverage)
    .slice(0, 10);

  // Every category with spending this month (not just the dashboard's top few),
  // with the same days of last month for comparison where available.
  const previousByCategory = new Map(dashboard.monthComparison.categories.map((c) => [c.category, c.previous]));
  const thisMonthByCategory = dashboard.thisMonthByCategory.map((c) => ({
    category: c.category,
    spentSoFar: r(c.spent),
    sameDaysLastMonth: previousByCategory.has(c.category) ? r(previousByCategory.get(c.category)) : undefined,
  }));

  return {
    currency: user.currency,
    today: new Date().toISOString().slice(0, 10),
    month: dashboard.month,
    dayOfMonth: dashboard.pace.daysElapsed,
    daysInMonth: dashboard.pace.daysInMonth,
    balance: { trackedBalance: r(dashboard.balance.balance) },
    thisMonth: {
      income: r(dashboard.thisMonth.income),
      incomeStillExpected: r(dashboard.thisMonth.incomeExpected),
      spent: r(dashboard.thisMonth.expense),
      saved: r(dashboard.thisMonth.net),
      savingsRatePercent: dashboard.thisMonth.savingsRate,
      projectedMonthEndSpending: r(dashboard.runRate.projected),
      usualMonthlySpending: r(dashboard.runRate.usualMonthly),
      averageDailyVariableSpending: r(dashboard.runRate.avgDailySpend),
      spendingByCategory: thisMonthByCategory,
    },
    lastSixMonths: dashboard.incomeVsExpense.map((m) => ({ month: m.month, income: r(m.income), spent: r(m.expense), net: r(m.net) })),
    typicalMonthlySpendingByCategory: typicalByCategory,
    safeToSpend: {
      amount: r(dashboard.safeToSpend.amount),
      perDay: r(dashboard.safeToSpend.perDay),
      basis: dashboard.safeToSpend.basis,
      breakdown: dashboard.safeToSpend.breakdown.map((b) => ({ item: b.label, amount: r(b.amount) })),
    },
    healthScore: {
      score: dashboard.healthScore.score,
      grade: dashboard.healthScore.grade,
      factors: dashboard.healthScore.factors.map((f) => ({ factor: f.label, points: f.points, maxPoints: f.maxPoints, detail: f.detail })),
    },
    budgets: [dashboard.budgets.overall && { ...dashboard.budgets.overall, category: 'Overall' }, ...dashboard.budgets.categories]
      .filter(Boolean)
      .map((b) => ({ category: b.category, limit: r(b.limit), spent: r(b.spent), remaining: r(b.remaining), status: b.status })),
    savingsGoals: dashboard.goals.map((g) => ({
      goal: g.name.slice(0, 40),
      target: r(g.targetAmount),
      saved: r(g.saved),
      requiredPerMonth: r(g.requiredMonthly),
      recentMonthlyPace: r(g.averageMonthly),
      deadline: g.deadline ? String(g.deadline).slice(0, 10) : null,
      pace: g.pace,
    })),
    unusualExpenses: dashboard.unusualExpenses.map((u) => ({
      category: u.category,
      amount: r(u.amount),
      date: new Date(u.date).toISOString().slice(0, 10),
      timesUsual: u.multiple,
      usualAmount: r(u.typicalAmount),
    })),
    incomeSources: sources.map((s) => ({ type: s.type, frequency: s.frequency, monthlyEquivalent: r(monthlyEquivalent(s)) })),
  };
}

/** Every number that appears anywhere in the context (for grounding checks). */
export function contextNumbers(context) {
  const numbers = new Set();
  const walk = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) numbers.add(Math.abs(value));
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(context);
  return [...numbers];
}

const AMOUNT_PATTERN = /(?:₹|rs\.?|inr|\$|€|£)\s?([\d,]+(?:\.\d+)?)\s*(k|l|lakh|lakhs|cr|crore)?/gi;
const MULTIPLIERS = { k: 1e3, l: 1e5, lakh: 1e5, lakhs: 1e5, cr: 1e7, crore: 1e7 };

/** Currency amounts written in a piece of text, as numbers. */
export function extractAmounts(text) {
  const amounts = [];
  for (const match of String(text).matchAll(AMOUNT_PATTERN)) {
    const value = Number(match[1].replace(/,/g, ''));
    if (!Number.isFinite(value)) continue;
    amounts.push(value * (MULTIPLIERS[match[2]?.toLowerCase()] ?? 1));
  }
  return amounts;
}

/**
 * Finds currency amounts in an AI reply that do not correspond to any number
 * the server provided (within 1%, or ₹1), nor to one the user typed. Simple
 * arithmetic on provided numbers (sums, differences) is accepted too.
 */
export function findUngroundedAmounts(reply, context, userText = '') {
  const known = [...contextNumbers(context), ...extractAmounts(userText)];
  const derived = new Set(known);
  const top = known.filter((n) => n >= 100).slice(0, 60);
  for (const a of top) {
    for (const b of top) {
      derived.add(Math.abs(a - b));
      derived.add(a + b);
    }
  }
  const matches = (value) => [...derived].some((n) => Math.abs(n - value) <= Math.max(1, n * 0.01));
  return extractAmounts(reply).filter((value) => value >= 100 && !matches(value));
}
