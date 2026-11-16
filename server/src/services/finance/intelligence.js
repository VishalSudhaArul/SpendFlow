/**
 * Financial Intelligence Engine — pure functions, no database access.
 *
 * Every number shown on the dashboard is computed here with a documented rule,
 * so it can be unit-tested and explained to the user. The AI coach (Phase 8)
 * receives these results; it never calculates totals itself.
 */
import { roundMoney } from '../../utils/money.js';
import { median } from './planning.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerpScore = (value, worst, best) => clamp((value - worst) / (best - worst), 0, 1);

/** (income − expenses) ÷ income, as a percentage. null when there is no income. */
export function savingsRate(income, expense) {
  if (!income || income <= 0) return null;
  return Math.round(((income - expense) / income) * 1000) / 10;
}

/**
 * SAFE-TO-SPEND for the rest of the current month.
 *
 *   available = income received this month
 *             + income still expected this month (active recurring sources)
 *             − spent so far this month
 *   reserved  = fixed costs not yet paid this month (typical month − paid so far)
 *             + goal savings still needed this month
 *             + safety buffer (5% of the month's income)
 *   safeToSpend = max(0, available − reserved), capped by the overall budget's
 *                 remaining amount when one is set.
 *
 * With no income data at all, falls back to the overall budget alone, and if
 * there is no budget either, returns null with an explanation.
 */
export function safeToSpend({
  incomeReceived,
  incomeExpected,
  spentSoFar,
  unpaidFixedCosts,
  goalSavingsDue,
  budgetRemaining = null,
  daysLeft,
}) {
  const monthIncome = incomeReceived + incomeExpected;
  const perDay = (amount) => (daysLeft > 0 ? roundMoney(amount / daysLeft) : roundMoney(amount));

  if (monthIncome <= 0) {
    if (budgetRemaining === null) {
      return { amount: null, perDay: null, basis: 'insufficient_data', breakdown: [] };
    }
    const amount = roundMoney(Math.max(0, budgetRemaining));
    return {
      amount,
      perDay: perDay(amount),
      basis: 'budget_only',
      breakdown: [{ key: 'budget', label: 'Left in your monthly budget', amount: roundMoney(budgetRemaining) }],
    };
  }

  const buffer = roundMoney(monthIncome * 0.05);
  const available = roundMoney(monthIncome - spentSoFar);
  const reserved = roundMoney(unpaidFixedCosts + goalSavingsDue + buffer);
  let amount = roundMoney(Math.max(0, available - reserved));
  let cappedByBudget = false;
  if (budgetRemaining !== null && budgetRemaining < amount) {
    amount = roundMoney(Math.max(0, budgetRemaining));
    cappedByBudget = true;
  }

  return {
    amount,
    perDay: perDay(amount),
    basis: cappedByBudget ? 'budget_cap' : 'cash_flow',
    breakdown: [
      { key: 'income_received', label: 'Income received this month', amount: roundMoney(incomeReceived) },
      { key: 'income_expected', label: 'Income still expected', amount: roundMoney(incomeExpected) },
      { key: 'spent', label: 'Already spent', amount: -roundMoney(spentSoFar) },
      { key: 'fixed', label: 'Upcoming fixed costs', amount: -roundMoney(unpaidFixedCosts) },
      { key: 'goals', label: 'Savings goals this month', amount: -roundMoney(goalSavingsDue) },
      { key: 'buffer', label: 'Safety buffer (5%)', amount: -buffer },
      ...(cappedByBudget ? [{ key: 'budget_cap', label: 'Limited by your monthly budget', amount: roundMoney(budgetRemaining) }] : []),
    ],
  };
}

/**
 * FINANCIAL HEALTH SCORE (0–100), from five transparent factors:
 *
 *  factor               weight  full marks          zero marks
 *  savings rate          30     ≥ 20% of income     ≤ 0%
 *  budget adherence      20     no budget over      every budget over
 *  spending trend        15     ≤ 3-month average   ≥ 130% of average
 *  emergency cushion     20     ≥ 6 months' costs   0 months
 *  fixed-cost burden     15     ≤ 35% of income     ≥ 60% of income
 *
 * A factor without enough data is skipped and its weight is shared out among
 * the others, so a new user is not penalised for having no history.
 */
export function healthScore({
  avgMonthlyIncome,
  avgMonthlyExpense,
  avgFixedCosts,
  budgetsTotal,
  budgetsOver,
  projectedSpend,
  savedInGoals,
}) {
  const factors = [];

  const rate = savingsRate(avgMonthlyIncome, avgMonthlyExpense);
  factors.push(
    rate === null
      ? { key: 'savings_rate', label: 'Savings rate', weight: 30, ratio: null, detail: 'Needs income history', tip: 'Record your income so SpendFlow can measure how much you save.' }
      : {
          key: 'savings_rate',
          label: 'Savings rate',
          weight: 30,
          ratio: lerpScore(rate, 0, 20),
          value: rate,
          detail: `You keep ${rate}% of your income (target: 20%)`,
          tip: rate < 20 ? 'Aim to keep at least 20% of income — start by trimming your biggest "wants" category.' : null,
        },
  );

  factors.push(
    budgetsTotal === 0
      ? { key: 'budget_adherence', label: 'Budget adherence', weight: 20, ratio: null, detail: 'No budgets this month', tip: 'Set a few category budgets to track this.' }
      : {
          key: 'budget_adherence',
          label: 'Budget adherence',
          weight: 20,
          ratio: 1 - budgetsOver / budgetsTotal,
          value: budgetsTotal - budgetsOver,
          detail: `${budgetsTotal - budgetsOver} of ${budgetsTotal} budgets within limit`,
          tip: budgetsOver > 0 ? 'Review the budgets that are over and adjust spending or the limits.' : null,
        },
  );

  if (!avgMonthlyExpense || projectedSpend === null) {
    factors.push({ key: 'spending_trend', label: 'Spending trend', weight: 15, ratio: null, detail: 'Needs more history', tip: null });
  } else {
    const ratio = projectedSpend / avgMonthlyExpense;
    factors.push({
      key: 'spending_trend',
      label: 'Spending trend',
      weight: 15,
      ratio: 1 - lerpScore(ratio, 1, 1.3),
      value: Math.round(ratio * 100),
      detail: `This month is on pace for ${Math.round(ratio * 100)}% of your usual spending`,
      tip: ratio > 1.05 ? 'You are spending faster than usual this month.' : null,
    });
  }

  if (!avgMonthlyExpense) {
    factors.push({ key: 'emergency_cushion', label: 'Emergency cushion', weight: 20, ratio: null, detail: 'Needs spending history', tip: null });
  } else {
    const months = savedInGoals / avgMonthlyExpense;
    factors.push({
      key: 'emergency_cushion',
      label: 'Emergency cushion',
      weight: 20,
      ratio: lerpScore(months, 0, 6),
      value: Math.round(months * 10) / 10,
      detail: `Savings cover ${Math.round(months * 10) / 10} months of expenses (target: 6)`,
      tip: months < 6 ? 'Build savings towards 6 months of expenses, e.g. with an emergency fund goal.' : null,
    });
  }

  if (!avgMonthlyIncome) {
    factors.push({ key: 'fixed_burden', label: 'Fixed-cost burden', weight: 15, ratio: null, detail: 'Needs income history', tip: null });
  } else {
    const share = (avgFixedCosts / avgMonthlyIncome) * 100;
    factors.push({
      key: 'fixed_burden',
      label: 'Fixed-cost burden',
      weight: 15,
      ratio: 1 - lerpScore(share, 35, 60),
      value: Math.round(share),
      detail: `Rent, EMIs, bills and subscriptions take ${Math.round(share)}% of income`,
      tip: share > 35 ? 'Fixed costs above 35% of income leave little room — review subscriptions and loans.' : null,
    });
  }

  const scored = factors.filter((f) => f.ratio !== null);
  if (scored.length < 2) {
    return { score: null, grade: 'insufficient_data', factors: factors.map(withPoints(0)) };
  }

  const usedWeight = scored.reduce((sum, f) => sum + f.weight, 0);
  const scale = 100 / usedWeight;
  const score = Math.round(scored.reduce((sum, f) => sum + f.ratio * f.weight * scale, 0));

  return { score, grade: gradeFor(score), factors: factors.map(withPoints(scale)) };
}

function withPoints(scale) {
  return (factor) => ({
    ...factor,
    maxPoints: factor.ratio === null ? 0 : Math.round(factor.weight * scale * 10) / 10,
    points: factor.ratio === null ? null : Math.round(factor.ratio * factor.weight * scale * 10) / 10,
  });
}

export function gradeFor(score) {
  if (score >= 80) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 50) return 'fair';
  return 'needs_attention';
}

/**
 * CASH-FLOW PROJECTION for the next N months:
 *   income  = expected monthly income from sources (else recent average)
 *   expense = typical (median) monthly spending of the last completed months
 *   balance = running total starting from the current tracked balance
 */
export function projectCashFlow({ startBalance, monthlyIncome, monthlyExpense, months, monthKeys }) {
  let balance = startBalance;
  return Array.from({ length: months }, (_, i) => {
    const net = roundMoney(monthlyIncome - monthlyExpense);
    balance = roundMoney(balance + net);
    return { month: monthKeys[i], income: roundMoney(monthlyIncome), expense: roundMoney(monthlyExpense), net, balance };
  });
}

function stdDev(values) {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
}

/**
 * UNUSUAL EXPENSE detection.
 *
 * An expense is unusual when, compared with the user's earlier expenses in the
 * SAME category, it is both:
 *   - at least 3× the typical (median) amount, and
 *   - above mean + 2.5 standard deviations.
 * At least 5 earlier expenses in the category are needed to judge. Categories
 * without enough history fall back to the user's overall spending: flagged if
 * at least 5× the median of all expenses.
 *
 * `candidates` and `history` are arrays of { id, amount, category, date, description }.
 */
export function detectUnusual(candidates, history) {
  const byCategory = new Map();
  for (const tx of history) {
    if (!byCategory.has(tx.category)) byCategory.set(tx.category, []);
    byCategory.get(tx.category).push(tx.amount);
  }
  const overall = history.map((t) => t.amount);
  const overallMedian = median(overall);

  const flagged = [];
  for (const tx of candidates) {
    const peers = byCategory.get(tx.category) ?? [];
    if (peers.length >= 5) {
      const typical = median(peers);
      const mean = peers.reduce((s, v) => s + v, 0) / peers.length;
      const threshold = Math.max(typical * 3, mean + 2.5 * stdDev(peers));
      if (tx.amount > threshold) {
        flagged.push({
          ...tx,
          typicalAmount: roundMoney(typical),
          multiple: Math.round((tx.amount / typical) * 10) / 10,
          reason: 'category',
          explanation: `${Math.round((tx.amount / typical) * 10) / 10}× your usual ${tx.category} expense`,
        });
      }
    } else if (overall.length >= 10 && tx.amount >= overallMedian * 5) {
      flagged.push({
        ...tx,
        typicalAmount: roundMoney(overallMedian),
        multiple: Math.round((tx.amount / overallMedian) * 10) / 10,
        reason: 'overall',
        explanation: `${Math.round((tx.amount / overallMedian) * 10) / 10}× your typical expense, in a category you rarely use`,
      });
    }
  }
  return flagged.sort((a, b) => b.multiple - a.multiple);
}
