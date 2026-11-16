/**
 * Pure, deterministic planning calculations (no database access), so every
 * rule here is unit-tested and explainable. Gemini never computes these numbers.
 */
import { FIXED_CATEGORIES, NEEDS_CATEGORIES, SAVINGS_CATEGORIES, WANTS_CATEGORIES } from '../../constants/finance.js';
import { roundMoney } from '../../utils/money.js';
import { addMonthsUtc, monthKey, startOfMonthUtc } from '../../utils/dates.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-11" -> { start, end (exclusive), daysInMonth } in UTC. */
export function monthBounds(key) {
  const [year, month] = key.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end, daysInMonth: Math.round((end - start) / DAY_MS) };
}

export function shiftMonth(key, delta) {
  return monthKey(addMonthsUtc(monthBounds(key).start, delta));
}

/** Where `today` sits relative to the month: past, current or future, and days elapsed. */
export function monthPace(key, today) {
  const { start, end, daysInMonth } = monthBounds(key);
  if (today >= end) return { phase: 'past', daysInMonth, daysElapsed: daysInMonth, daysLeft: 0 };
  if (today < start) return { phase: 'future', daysInMonth, daysElapsed: 0, daysLeft: daysInMonth };
  const daysElapsed = Math.floor((today - start) / DAY_MS) + 1; // today counts as a spending day
  return { phase: 'current', daysInMonth, daysElapsed, daysLeft: daysInMonth - daysElapsed };
}

/**
 * Run-rate projection of month-end spending.
 *
 * Fixed costs (rent, EMIs, bills, subscriptions, investments) are usually paid
 * once, early in the month, so they are counted as-is. Only the remaining,
 * variable spending is extrapolated at its daily rate:
 *   projected = fixedSpent + (variableSpent / daysElapsed) × daysInMonth
 *
 * Only meaningful for the current month; with fewer than 3 days of data it is
 * too noisy and returns null.
 */
export function projectMonthEnd(spent, pace, fixedSpent = 0) {
  if (pace.phase === 'past') return roundMoney(spent);
  if (pace.phase === 'future' || pace.daysElapsed < 3) return null;
  const fixed = Math.min(fixedSpent, spent);
  return roundMoney(fixed + ((spent - fixed) / pace.daysElapsed) * pace.daysInMonth);
}

/**
 * Status of one budget:
 *  - over:    spent more than the limit
 *  - warning: reached the alert threshold, or on pace to exceed the limit
 *  - ok:      otherwise
 */
export function budgetProgress({ spent, limit, alertThreshold = 80, fixedSpent = 0 }, pace) {
  const percent = limit > 0 ? (spent / limit) * 100 : 0;
  const projected = pace ? projectMonthEnd(spent, pace, fixedSpent) : null;
  let status = 'ok';
  let reason = null;

  // A budget made only of fixed costs (an EMI, rent) reaching 100% is expected,
  // so it alerts only when actually exceeded.
  const allFixed = spent > 0 && fixedSpent >= spent;

  if (spent > limit) {
    status = 'over';
    reason = 'over_limit';
  } else if (allFixed) {
    // no warning
  } else if (percent >= alertThreshold) {
    status = 'warning';
    reason = 'threshold_reached';
  } else if (pace?.phase === 'current' && projected !== null && projected > limit) {
    status = 'warning';
    reason = 'on_pace_to_exceed';
  }

  return {
    spent: roundMoney(spent),
    limit: roundMoney(limit),
    remaining: roundMoney(limit - spent),
    percent: Math.round(percent * 10) / 10,
    projected,
    // Spending allowed per remaining day to stay inside the limit (current month only).
    dailyAllowance:
      pace?.phase === 'current' && pace.daysLeft > 0 ? roundMoney(Math.max(0, limit - spent) / (pace.daysLeft + 1)) : null,
    status,
    reason,
  };
}

/** Rounds a suggested amount up to a "budget-friendly" step. */
export function roundBudget(amount) {
  if (amount <= 0) return 0;
  const step = amount >= 20_000 ? 1000 : amount >= 2_000 ? 500 : 100;
  return Math.ceil(amount / step) * step;
}

/**
 * Suggests category limits from the last N completed months of spending.
 * `history` is { [category]: number[] } of monthly totals (missing months = 0).
 *
 * The suggestion uses the MEDIAN month, so one unusual purchase (a new phone)
 * does not inflate the limit. A category needs spending in at least 2 of the
 * months to get a suggestion. Savings categories (investments) are excluded:
 * they are not spending to be limited.
 */
export function recommendBudgets(history, { currentLimits = {} } = {}) {
  return Object.entries(history)
    .filter(([category]) => !SAVINGS_CATEGORIES.includes(category))
    .map(([category, months]) => {
      const active = months.filter((value) => value > 0);
      if (active.length < 2) return null;
      const average = months.reduce((sum, value) => sum + value, 0) / months.length;
      const typical = median(months);
      const peak = Math.max(...months);
      const suggested = roundBudget(typical);
      const current = currentLimits[category] ?? null;

      let note = 'Based on a typical month of your spending.';
      if (peak > typical * 1.6) note = 'One month was unusually high; suggestion ignores it.';
      if (current !== null && typical > current * 1.05) note = 'You usually spend more than this limit.';
      else if (current !== null && typical < current * 0.7) note = 'Your limit is well above what you usually spend.';

      return {
        category,
        typicalMonthly: roundMoney(typical),
        averageMonthly: roundMoney(average),
        highestMonth: roundMoney(peak),
        suggestedLimit: suggested,
        currentLimit: current,
        note,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.typicalMonthly - a.typicalMonthly);
}

export function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Divides a bucket between its categories:
 *  1. Fixed costs (rent, EMIs, bills, subscriptions) keep their typical amount —
 *     a budget cannot shrink a rent payment.
 *  2. What is left is shared between flexible categories in proportion to their
 *     typical (median) month, so a one-off purchase doesn't skew the split.
 */
function splitByHistory(total, categories, history) {
  const typical = categories
    .map((category) => ({ category, amount: median(history[category] ?? []) }))
    .filter((c) => c.amount > 0);
  // No history: nothing to split by — leave the bucket as a single total.
  if (typical.length === 0) return [];

  const fixed = typical
    .filter((c) => FIXED_CATEGORIES.includes(c.category))
    .map((c) => ({ category: c.category, suggestedLimit: roundBudget(c.amount), fixed: true }));
  const flexible = typical.filter((c) => !FIXED_CATEGORIES.includes(c.category));

  const leftover = Math.max(0, total - fixed.reduce((sum, c) => sum + c.suggestedLimit, 0));
  const weight = flexible.reduce((sum, c) => sum + c.amount, 0);
  const shared = flexible.map((c) => ({
    category: c.category,
    suggestedLimit: Math.max(100, Math.floor((leftover * c.amount) / weight / 100) * 100),
    fixed: false,
  }));

  return [...fixed, ...shared].sort((a, b) => b.suggestedLimit - a.suggestedLimit);
}

/**
 * 50/30/20 plan: 50% needs, 30% wants, 20% savings of monthly income.
 * Each spending bucket is divided between categories in proportion to how the
 * user has actually spent recently. `actualMonthly` compares the current split.
 */
export function fiftyThirtyTwenty(monthlyIncome, history) {
  const income = roundMoney(monthlyIncome);
  const bucket = (share) => roundMoney(income * share);
  const months = Math.max(1, ...Object.values(history).map((list) => list.length));
  const avg = (categories) =>
    roundMoney(categories.reduce((sum, c) => sum + (history[c] ?? []).reduce((s, v) => s + v, 0), 0) / months);

  const actualNeeds = avg(NEEDS_CATEGORIES);
  const actualWants = avg(WANTS_CATEGORIES);
  const actualInvested = avg(SAVINGS_CATEGORIES);
  const actualSaved = roundMoney(income - actualNeeds - actualWants);

  const pct = (value) => (income > 0 ? Math.round((value / income) * 1000) / 10 : 0);

  return {
    monthlyIncome: income,
    needs: { share: 50, target: bucket(0.5), actual: actualNeeds, actualShare: pct(actualNeeds), categories: splitByHistory(bucket(0.5), NEEDS_CATEGORIES, history) },
    wants: { share: 30, target: bucket(0.3), actual: actualWants, actualShare: pct(actualWants), categories: splitByHistory(bucket(0.3), WANTS_CATEGORIES, history) },
    savings: {
      share: 20,
      target: bucket(0.2),
      // Everything not spent on needs or wants (includes investments).
      actual: actualSaved,
      actualShare: pct(actualSaved),
      investedMonthly: actualInvested,
    },
  };
}

/** Whole months from `today` until `deadline` (at least 1 while the deadline is in the future). */
export function monthsUntil(deadline, today) {
  if (!deadline) return null;
  if (deadline <= today) return 0;
  let months =
    (deadline.getUTCFullYear() - today.getUTCFullYear()) * 12 + (deadline.getUTCMonth() - today.getUTCMonth());
  // Only count a month once its day-of-month has been reached (Nov 16 -> Dec 10 is not a full month).
  if (deadline.getUTCDate() < today.getUTCDate()) months -= 1;
  return Math.max(1, months);
}

/**
 * Progress maths for a savings goal:
 *  - requiredMonthly: what must be saved each month to hit the deadline
 *  - averageMonthly:  net contributions per month over the last 3 months
 *  - onTrack:         average pace meets the required pace
 *  - projectedCompletion: month the goal completes at the current pace
 */
export function goalProjection(goal, today) {
  const saved = roundMoney(goal.savedAmount);
  const remaining = roundMoney(Math.max(0, goal.targetAmount - saved));
  const percent = Math.min(100, Math.round((saved / goal.targetAmount) * 1000) / 10);

  const windowStart = addMonthsUtc(startOfMonthUtc(today), -2); // this month + 2 previous
  const recent = (goal.contributions ?? []).filter((c) => new Date(c.date) >= windowStart);
  const averageMonthly = roundMoney(recent.reduce((sum, c) => sum + c.amount, 0) / 3);

  const monthsLeft = monthsUntil(goal.deadline ? new Date(goal.deadline) : null, today);
  let requiredMonthly = null;
  if (monthsLeft !== null && remaining > 0) {
    requiredMonthly = monthsLeft === 0 ? remaining : roundMoney(remaining / monthsLeft);
  }

  let projectedCompletion = null;
  if (remaining === 0) projectedCompletion = monthKey(today);
  else if (averageMonthly > 0) projectedCompletion = monthKey(addMonthsUtc(today, Math.ceil(remaining / averageMonthly)));

  let pace = 'no_deadline';
  if (remaining === 0) pace = 'reached';
  else if (monthsLeft === 0) pace = 'overdue';
  else if (requiredMonthly !== null) pace = averageMonthly >= requiredMonthly ? 'on_track' : 'behind';

  return { saved, remaining, percent, monthsLeft, requiredMonthly, averageMonthly, projectedCompletion, pace };
}
