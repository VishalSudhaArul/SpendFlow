import { IncomeSource } from '../models/IncomeSource.js';
import { Budget } from '../models/Budget.js';
import { SavingsGoal } from '../models/SavingsGoal.js';
import { roundMoney } from '../utils/money.js';
import { monthKey, todayUtc } from '../utils/dates.js';
import { goalProjection, median, shiftMonth } from './finance/planning.js';
import { simulate } from './finance/simulation.js';
import { monthlyEquivalent } from './incomeService.js';
import { allTimeTotals, categoryMonthMatrix, monthlyTotals } from './analyticsData.js';

const HISTORY_MONTHS = 3;

/** The user's "typical month", explained, plus the context the simulation needs. */
export async function loadBaseline(userId) {
  const today = todayUtc();
  const current = monthKey(today);
  const completed = Array.from({ length: HISTORY_MONTHS }, (_, i) => shiftMonth(current, -(HISTORY_MONTHS - i)));

  const [matrix, history, sources, totals, budgets, goals] = await Promise.all([
    categoryMonthMatrix(userId, completed),
    monthlyTotals(userId, completed.at(-1), HISTORY_MONTHS),
    IncomeSource.find({ userId, isActive: true }),
    allTimeTotals(userId),
    Budget.find({ userId, month: current }),
    SavingsGoal.find({ userId, status: 'active' }),
  ]);

  const expected = roundMoney(sources.reduce((sum, s) => sum + monthlyEquivalent(s), 0));
  const withIncome = history.filter((m) => m.income > 0);
  const avgIncome = withIncome.length ? roundMoney(withIncome.reduce((s, m) => s + m.income, 0) / withIncome.length) : 0;

  const categories = Object.entries(matrix)
    .map(([category, values]) => ({ category, amount: roundMoney(median(values)) }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return {
    baseline: {
      income: expected > 0 ? expected : avgIncome,
      incomeBasis: expected > 0 ? 'income_sources' : avgIncome > 0 ? 'recent_average' : 'none',
      categories,
      basedOnMonths: completed,
    },
    context: {
      startBalance: totals.balance,
      currentMonth: current,
      budgets: {
        overall: budgets.find((b) => b.category === null)?.limit ?? null,
        categories: Object.fromEntries(budgets.filter((b) => b.category).map((b) => [b.category, b.limit])),
      },
      goalsRequiredMonthly: roundMoney(goals.reduce((sum, g) => sum + (goalProjection(g, today).requiredMonthly ?? 0), 0)),
    },
  };
}

export async function runSimulation(userId, { scenarios, months }) {
  const { baseline, context } = await loadBaseline(userId);
  const result = simulate({
    baseline,
    scenarios,
    context: {
      ...context,
      emergencyMonths: 1,
      monthKeys: Array.from({ length: months }, (_, i) => shiftMonth(context.currentMonth, i + 1)),
    },
  });
  return {
    ...result,
    assumptions: {
      incomeBasis: baseline.incomeBasis,
      basedOnMonths: baseline.basedOnMonths,
      startBalance: context.startBalance,
      startsFrom: shiftMonth(context.currentMonth, 1),
    },
    hasEnoughData: baseline.income > 0 && baseline.categories.length > 0,
  };
}
