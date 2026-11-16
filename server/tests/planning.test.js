import { describe, it, expect } from 'vitest';
import {
  budgetProgress,
  fiftyThirtyTwenty,
  goalProjection,
  monthBounds,
  monthPace,
  monthsUntil,
  projectMonthEnd,
  recommendBudgets,
  roundBudget,
  shiftMonth,
} from '../src/services/finance/planning.js';
import { parseDateOnly } from '../src/utils/dates.js';

const d = parseDateOnly;

describe('month helpers', () => {
  it('computes bounds and shifts across years', () => {
    expect(monthBounds('2026-02').daysInMonth).toBe(28);
    expect(monthBounds('2028-02').daysInMonth).toBe(29);
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-11', 2)).toBe('2027-01');
  });

  it('classifies past, current and future months', () => {
    expect(monthPace('2026-11', d('2026-11-16'))).toEqual({ phase: 'current', daysInMonth: 30, daysElapsed: 16, daysLeft: 14 });
    expect(monthPace('2026-10', d('2026-11-16')).phase).toBe('past');
    expect(monthPace('2026-12', d('2026-11-16')).phase).toBe('future');
  });
});

describe('budget progress', () => {
  const nov16 = monthPace('2026-11', d('2026-11-16'));

  it('projects month-end spending from the daily run-rate', () => {
    expect(projectMonthEnd(8000, nov16)).toBe(15000); // 500/day * 30
    expect(projectMonthEnd(100, monthPace('2026-11', d('2026-11-02')))).toBeNull(); // too early to tell
  });

  it('counts fixed costs once instead of extrapolating them', () => {
    // 22000 rent + 4800 variable by day 16: 22000 + 300/day * 30 = 31000 (not 50250).
    expect(projectMonthEnd(26800, nov16, 22000)).toBe(31000);
  });

  it('is ok when well under the limit and the pace is fine', () => {
    expect(budgetProgress({ spent: 4000, limit: 10000 }, nov16)).toMatchObject({ status: 'ok', remaining: 6000, percent: 40 });
  });

  it('warns at the alert threshold', () => {
    expect(budgetProgress({ spent: 8200, limit: 10000, alertThreshold: 80 }, nov16)).toMatchObject({
      status: 'warning',
      reason: 'threshold_reached',
    });
  });

  it('warns when on pace to exceed even if under the threshold', () => {
    // 7000 by day 16 -> ~13125 projected against 12000.
    expect(budgetProgress({ spent: 7000, limit: 12000 }, nov16)).toMatchObject({ status: 'warning', reason: 'on_pace_to_exceed' });
  });

  it('does not warn when a fixed-cost budget is exactly used up', () => {
    expect(budgetProgress({ spent: 4500, limit: 4500, fixedSpent: 4500 }, nov16)).toMatchObject({ status: 'ok', percent: 100 });
    expect(budgetProgress({ spent: 4600, limit: 4500, fixedSpent: 4600 }, nov16).status).toBe('over');
  });

  it('is over when spending exceeds the limit', () => {
    expect(budgetProgress({ spent: 12500, limit: 12000 }, nov16)).toMatchObject({ status: 'over', remaining: -500 });
  });

  it('gives a daily allowance for the rest of the month', () => {
    // 6000 left over 15 days (today + 14) = 400/day.
    expect(budgetProgress({ spent: 4000, limit: 10000 }, nov16).dailyAllowance).toBe(400);
  });
});

describe('recommendations', () => {
  it('rounds to friendly steps', () => {
    expect(roundBudget(1234)).toBe(1300);
    expect(roundBudget(4120)).toBe(4500);
    expect(roundBudget(22100)).toBe(23000);
  });

  it('suggests limits from the typical (median) month and flags tight budgets', () => {
    const result = recommendBudgets(
      { Groceries: [4000, 5000, 6000], Travel: [0, 0, 9000], Shopping: [1000, 1200, 39000], Investments: [8000, 8000, 8000] },
      { currentLimits: { Groceries: 4000 } },
    );
    // Travel: only 1 active month. Investments: savings, never a spending limit.
    expect(result.map((r) => r.category)).toEqual(['Groceries', 'Shopping']);
    expect(result[0]).toMatchObject({ suggestedLimit: 5000, currentLimit: 4000, note: 'You usually spend more than this limit.' });
    // One huge month does not inflate the suggestion.
    expect(result[1]).toMatchObject({ typicalMonthly: 1200, suggestedLimit: 1200, note: 'One month was unusually high; suggestion ignores it.' });
  });
});

describe('50/30/20 plan', () => {
  it('splits income into buckets, keeping fixed costs and sharing the rest by typical spending', () => {
    const plan = fiftyThirtyTwenty(100000, {
      'Rent & Housing': [30000, 30000, 30000],
      Groceries: [6000, 6000, 6000],
      Transport: [2000, 2000, 2000],
      'Food & Dining': [4000, 4000, 4000],
      Shopping: [2000, 2000, 40000], // one outlier month
      Investments: [5000, 5000, 5000],
    });
    expect(plan.needs).toMatchObject({ target: 50000, actual: 38000, actualShare: 38 });
    // Rent stays at its real amount; the remaining 20000 is shared 3:1 by typical month.
    expect(plan.needs.categories).toEqual([
      { category: 'Rent & Housing', suggestedLimit: 30000, fixed: true },
      { category: 'Groceries', suggestedLimit: 15000, fixed: false },
      { category: 'Transport', suggestedLimit: 5000, fixed: false },
    ]);
    // Shopping is weighted by its typical 2000, not inflated by the 40000 month.
    expect(plan.wants.target).toBe(30000);
    expect(plan.wants.categories).toEqual([
      { category: 'Food & Dining', suggestedLimit: 20000, fixed: false },
      { category: 'Shopping', suggestedLimit: 10000, fixed: false },
    ]);
    expect(plan.savings).toMatchObject({ target: 20000, investedMonthly: 5000 });
  });
});

describe('savings goal projection', () => {
  const today = d('2026-11-16');

  it('counts whole months to the deadline', () => {
    expect(monthsUntil(d('2027-05-16'), today)).toBe(6);
    expect(monthsUntil(d('2027-05-10'), today)).toBe(5);
    expect(monthsUntil(d('2026-11-30'), today)).toBe(1);
    expect(monthsUntil(d('2026-11-01'), today)).toBe(0);
  });

  it('computes required monthly saving and pace', () => {
    const goal = {
      targetAmount: 60000,
      savedAmount: 12000,
      deadline: d('2027-05-16'),
      contributions: [
        { amount: 6000, date: d('2026-09-10') },
        { amount: 4000, date: d('2026-10-05') },
        { amount: 2000, date: d('2026-11-02') },
      ],
    };
    const result = goalProjection(goal, today);
    expect(result).toMatchObject({ remaining: 48000, percent: 20, monthsLeft: 6, requiredMonthly: 8000 });
    // Window = this month + 2 previous (Sep 1 – today): 12000 / 3 months.
    expect(result.averageMonthly).toBe(4000);
    expect(result.pace).toBe('behind');
    expect(result.projectedCompletion).toBe('2027-11'); // 48000 / 4000 = 12 more months
  });

  it('reports reached, overdue and no-deadline goals', () => {
    expect(goalProjection({ targetAmount: 100, savedAmount: 100, contributions: [] }, today).pace).toBe('reached');
    expect(goalProjection({ targetAmount: 100, savedAmount: 10, deadline: d('2026-10-01'), contributions: [] }, today)).toMatchObject({
      pace: 'overdue',
      requiredMonthly: 90,
    });
    expect(goalProjection({ targetAmount: 100, savedAmount: 10, deadline: null, contributions: [] }, today)).toMatchObject({
      pace: 'no_deadline',
      requiredMonthly: null,
      projectedCompletion: null,
    });
  });
});
