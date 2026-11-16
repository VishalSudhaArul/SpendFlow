import { IncomeSource } from '../models/IncomeSource.js';
import { SavingsGoal } from '../models/SavingsGoal.js';
import { Transaction } from '../models/Transaction.js';
import { FIXED_CATEGORIES } from '../constants/finance.js';
import { roundMoney } from '../utils/money.js';
import { addDaysUtc, advanceByFrequency, monthKey, todayUtc } from '../utils/dates.js';
import { median, monthBounds, monthPace, projectMonthEnd, shiftMonth } from './finance/planning.js';
import { healthScore, savingsRate, safeToSpend, detectUnusual } from './finance/intelligence.js';
import { getBudgetOverview } from './budgetService.js';
import { monthlyEquivalent } from './incomeService.js';
import { withProjection } from './goalService.js';
import {
  allTimeTotals,
  categoryMonthMatrix,
  expensesBetween,
  expensesByCategory,
  monthlyTotals,
  oid,
} from './analyticsData.js';

const HISTORY_MONTHS = 3;
const PRIORITY = { high: 0, medium: 1, low: 2 };

const average = (values) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0);

/**
 * Income still expected before the end of this month from active recurring sources.
 * Uses each source's next expected date when known; otherwise its monthly
 * equivalent minus what it has already paid this month.
 */
async function expectedIncomeRemaining(userId, today, monthEnd) {
  const monthStart = monthBounds(monthKey(today)).start;
  const [sources, received] = await Promise.all([
    IncomeSource.find({ userId, isActive: true, frequency: { $ne: 'irregular' } }),
    Transaction.aggregate([
      { $match: { userId: oid(userId), type: 'income', incomeSourceId: { $ne: null }, date: { $gte: monthStart, $lt: monthEnd } } },
      { $group: { _id: '$incomeSourceId', total: { $sum: '$amount' } } },
    ]),
  ]);
  const receivedById = new Map(received.map((r) => [r._id.toString(), r.total]));

  let total = 0;
  for (const source of sources) {
    if (source.nextExpectedDate) {
      let next = source.nextExpectedDate;
      let guard = 0;
      while (next < monthEnd && guard < 10) {
        if (next >= today) total += source.expectedAmount;
        next = advanceByFrequency(next, source.frequency);
        guard += 1;
      }
    } else {
      total += Math.max(0, monthlyEquivalent(source) - (receivedById.get(source._id.toString()) ?? 0));
    }
  }
  return roundMoney(total);
}

export async function getDashboard(userId) {
  const today = todayUtc();
  const currentMonth = monthKey(today);
  const lastMonth = shiftMonth(currentMonth, -1);
  const completedMonths = Array.from({ length: HISTORY_MONTHS }, (_, i) => shiftMonth(currentMonth, -(HISTORY_MONTHS - i)));
  const { start: monthStart, end: monthEnd } = monthBounds(currentMonth);
  const pace = monthPace(currentMonth, today);
  const tomorrow = addDaysUtc(today, 1);

  // Same days of last month, for a fair "so far" comparison.
  const lastMonthStart = monthBounds(lastMonth).start;
  const lastMonthDays = monthBounds(lastMonth).daysInMonth;
  const comparisonEnd = addDaysUtc(lastMonthStart, Math.min(pace.daysElapsed, lastMonthDays));

  const [
    totals,
    trend,
    thisMonthByCategory,
    lastMonthSoFarByCategory,
    matrix,
    incomeExpected,
    budgets,
    goals,
    recent,
    recentExpenses,
    historyExpenses,
    sources,
  ] = await Promise.all([
    allTimeTotals(userId),
    monthlyTotals(userId, currentMonth, 6),
    expensesByCategory(userId, monthStart, monthEnd),
    expensesByCategory(userId, lastMonthStart, comparisonEnd),
    categoryMonthMatrix(userId, completedMonths),
    expectedIncomeRemaining(userId, today, monthEnd),
    getBudgetOverview(userId, currentMonth),
    SavingsGoal.find({ userId, status: { $ne: 'archived' } }),
    Transaction.find({ userId }).sort({ date: -1, _id: -1 }).limit(6),
    expensesBetween(userId, addDaysUtc(today, -30), tomorrow),
    expensesBetween(userId, addDaysUtc(today, -210), addDaysUtc(today, -30)),
    IncomeSource.find({ userId, isActive: true }),
  ]);

  const thisMonth = trend.at(-1);
  const completed = trend.filter((m) => completedMonths.includes(m.month));
  const completedWithIncome = completed.filter((m) => m.income > 0);
  const expectedMonthly = roundMoney(sources.reduce((sum, s) => sum + monthlyEquivalent(s), 0));

  const avgMonthlyIncome = completedWithIncome.length ? average(completedWithIncome.map((m) => m.income)) : expectedMonthly;
  const completedWithSpend = completed.filter((m) => m.expense > 0);
  const avgMonthlyExpense = completedWithSpend.length ? average(completedWithSpend.map((m) => m.expense)) : 0;
  const avgFixedCosts = FIXED_CATEGORIES.reduce((sum, c) => sum + average(matrix[c] ?? [0]), 0);

  // Fixed costs: typical month minus what has already been paid this month.
  const fixedSpentThisMonth = FIXED_CATEGORIES.reduce((sum, c) => sum + (thisMonthByCategory.get(c)?.total ?? 0), 0);
  const unpaidFixedCosts = FIXED_CATEGORIES.reduce((sum, c) => {
    const typical = median(matrix[c] ?? []);
    return sum + Math.max(0, typical - (thisMonthByCategory.get(c)?.total ?? 0));
  }, 0);

  // Goal savings still due this month: required monthly pace minus deposits made this month.
  const goalViews = goals.map((g) => withProjection(g, today));
  const goalSavingsDue = goalViews
    .filter((g) => g.status === 'active' && g.requiredMonthly)
    .reduce((sum, g) => {
      const depositedThisMonth = g.contributions
        .filter((c) => new Date(c.date) >= monthStart && c.amount > 0)
        .reduce((s, c) => s + c.amount, 0);
      return sum + Math.max(0, g.requiredMonthly - depositedThisMonth);
    }, 0);

  const projected = projectMonthEnd(thisMonth.expense, pace, fixedSpentThisMonth);
  const allBudgets = [budgets.overall, ...budgets.categories].filter(Boolean);

  const safe = safeToSpend({
    incomeReceived: thisMonth.income,
    incomeExpected,
    spentSoFar: thisMonth.expense,
    unpaidFixedCosts,
    goalSavingsDue,
    budgetRemaining: budgets.overall ? budgets.overall.remaining : null,
    daysLeft: pace.daysLeft + 1,
  });

  const health = healthScore({
    avgMonthlyIncome,
    avgMonthlyExpense,
    avgFixedCosts,
    budgetsTotal: allBudgets.length,
    budgetsOver: allBudgets.filter((b) => b.status === 'over').length,
    projectedSpend: projected,
    savedInGoals: goalViews.reduce((sum, g) => sum + g.saved, 0),
  });

  const comparisonCategories = new Set([...thisMonthByCategory.keys(), ...lastMonthSoFarByCategory.keys()]);
  const monthComparison = [...comparisonCategories]
    .map((category) => {
      const current = thisMonthByCategory.get(category)?.total ?? 0;
      const previous = lastMonthSoFarByCategory.get(category)?.total ?? 0;
      return { category, current, previous, change: roundMoney(current - previous) };
    })
    .sort((a, b) => Math.max(b.current, b.previous) - Math.max(a.current, a.previous))
    .slice(0, 6);
  const lastMonthSoFar = roundMoney([...lastMonthSoFarByCategory.values()].reduce((s, v) => s + v.total, 0));

  const unusual = detectUnusual(
    recentExpenses.map((t) => ({ id: t._id.toString(), amount: t.amount, category: t.category, date: t.date, description: t.description })),
    historyExpenses.map((t) => ({ amount: t.amount, category: t.category })),
  ).slice(0, 3);

  return {
    generatedAt: new Date().toISOString(),
    month: currentMonth,
    pace,
    balance: totals,
    thisMonth: {
      income: thisMonth.income,
      expense: thisMonth.expense,
      net: thisMonth.net,
      savingsRate: savingsRate(thisMonth.income, thisMonth.expense),
      incomeExpected,
    },
    safeToSpend: safe,
    healthScore: health,
    runRate: {
      spentSoFar: thisMonth.expense,
      projected,
      usualMonthly: avgMonthlyExpense ? roundMoney(avgMonthlyExpense) : null,
      avgDailySpend: pace.daysElapsed ? roundMoney((thisMonth.expense - fixedSpentThisMonth) / pace.daysElapsed) : null,
    },
    incomeVsExpense: trend,
    monthComparison: {
      throughDay: pace.daysElapsed,
      currentTotal: thisMonth.expense,
      previousTotal: lastMonthSoFar,
      categories: monthComparison,
    },
    recentTransactions: recent,
    budgets: {
      overall: budgets.overall,
      categories: budgets.categories.slice(0, 5),
      alertCount: budgets.alerts.length,
    },
    goals: goalViews
      .filter((g) => g.status === 'active')
      .sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority] || b.percent - a.percent)
      .slice(0, 3)
      .map(({ contributions: _c, ...g }) => g),
    unusualExpenses: unusual,
  };
}
