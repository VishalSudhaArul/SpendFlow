import { describe, it, expect } from 'vitest';
import { detectUnusual, gradeFor, healthScore, projectCashFlow, safeToSpend, savingsRate } from '../src/services/finance/intelligence.js';
import { bucketKeys, resolveRange, truncate } from '../src/services/analyticsService.js';
import { parseDateOnly, toDateOnly } from '../src/utils/dates.js';

describe('savings rate', () => {
  it('is (income − expenses) ÷ income', () => {
    expect(savingsRate(100000, 80000)).toBe(20);
    expect(savingsRate(50000, 60000)).toBe(-20);
    expect(savingsRate(0, 500)).toBeNull();
  });
});

describe('safe-to-spend', () => {
  const base = {
    incomeReceived: 85000,
    incomeExpected: 0,
    spentSoFar: 40000,
    unpaidFixedCosts: 3000,
    goalSavingsDue: 10000,
    daysLeft: 15,
  };

  it('subtracts spending, unpaid fixed costs, goal savings and a 5% buffer', () => {
    // 85000 − 40000 − 3000 − 10000 − 4250 = 27750
    const result = safeToSpend(base);
    expect(result).toMatchObject({ amount: 27750, perDay: 1850, basis: 'cash_flow' });
    expect(result.breakdown.find((b) => b.key === 'buffer').amount).toBe(-4250);
  });

  it('counts income still expected this month', () => {
    expect(safeToSpend({ ...base, incomeReceived: 0, incomeExpected: 85000 }).amount).toBe(27750);
  });

  it('is capped by the remaining overall budget', () => {
    expect(safeToSpend({ ...base, budgetRemaining: 9000 })).toMatchObject({ amount: 9000, basis: 'budget_cap' });
  });

  it('never goes negative', () => {
    expect(safeToSpend({ ...base, spentSoFar: 90000 }).amount).toBe(0);
  });

  it('falls back to the budget, then to "insufficient data", without income', () => {
    const noIncome = { ...base, incomeReceived: 0 };
    expect(safeToSpend({ ...noIncome, budgetRemaining: 6000 })).toMatchObject({ amount: 6000, basis: 'budget_only', perDay: 400 });
    expect(safeToSpend(noIncome)).toMatchObject({ amount: null, basis: 'insufficient_data' });
  });
});

describe('financial health score', () => {
  const healthy = {
    avgMonthlyIncome: 100000,
    avgMonthlyExpense: 70000,
    avgFixedCosts: 30000,
    budgetsTotal: 5,
    budgetsOver: 0,
    projectedSpend: 68000,
    savedInGoals: 420000,
  };

  it('scores a healthy profile 100 and explains each factor', () => {
    const result = healthScore(healthy);
    expect(result).toMatchObject({ score: 100, grade: 'excellent' });
    expect(result.factors).toHaveLength(5);
    expect(result.factors.every((f) => f.points === f.maxPoints)).toBe(true);
  });

  it('applies each rule linearly', () => {
    const result = healthScore({
      ...healthy,
      avgMonthlyExpense: 90000, // 10% savings → half of 30
      budgetsOver: 1, // 4/5 → 16 of 20
      projectedSpend: 103500, // 115% → half of 15
      savedInGoals: 270000, // 3 months → half of 20
      avgFixedCosts: 47500, // 47.5% → half of 15
    });
    expect(result.factors.map((f) => f.points)).toEqual([15, 16, 7.5, 10, 7.5]);
    expect(result.score).toBe(56);
    expect(result.grade).toBe('fair');
  });

  it('redistributes weight when data is missing instead of penalising', () => {
    const result = healthScore({ ...healthy, budgetsTotal: 0 });
    expect(result.score).toBe(100);
    const budget = result.factors.find((f) => f.key === 'budget_adherence');
    expect(budget).toMatchObject({ points: null, maxPoints: 0 });
    expect(result.factors.find((f) => f.key === 'savings_rate').maxPoints).toBe(37.5); // 30 × 100/80
  });

  it('returns no score for a brand-new user', () => {
    const result = healthScore({ avgMonthlyIncome: 0, avgMonthlyExpense: 0, avgFixedCosts: 0, budgetsTotal: 0, budgetsOver: 0, projectedSpend: null, savedInGoals: 0 });
    expect(result).toMatchObject({ score: null, grade: 'insufficient_data' });
  });

  it('grades scores', () => {
    expect([85, 70, 55, 30].map(gradeFor)).toEqual(['excellent', 'good', 'fair', 'needs_attention']);
  });
});

describe('cash-flow projection', () => {
  it('rolls the balance forward month by month', () => {
    const result = projectCashFlow({ startBalance: 10000, monthlyIncome: 80000, monthlyExpense: 70000, months: 3, monthKeys: ['2026-12', '2027-01', '2027-02'] });
    expect(result.map((m) => m.balance)).toEqual([20000, 30000, 40000]);
    expect(result[0]).toMatchObject({ month: '2026-12', net: 10000 });
  });
});

describe('unusual expense detection', () => {
  const history = [
    ...[500, 650, 700, 800, 600, 750].map((amount) => ({ amount, category: 'Shopping' })),
    ...[200, 250, 300, 220, 280].map((amount) => ({ amount, category: 'Food & Dining' })),
  ];

  it('flags an expense far above the usual for its category', () => {
    const result = detectUnusual(
      [
        { id: 'a', amount: 38999, category: 'Shopping', description: 'New phone' },
        { id: 'b', amount: 900, category: 'Shopping', description: 'Shoes' },
        { id: 'c', amount: 320, category: 'Food & Dining', description: 'Dinner' },
      ],
      history,
    );
    expect(result.map((r) => r.id)).toEqual(['a']);
    expect(result[0]).toMatchObject({ reason: 'category', typicalAmount: 675 });
    expect(result[0].explanation).toMatch(/× your usual Shopping expense/);
  });

  it('uses overall spending for categories with little history', () => {
    const result = detectUnusual([{ id: 'x', amount: 5000, category: 'Travel', description: 'Flight' }], history);
    expect(result[0]).toMatchObject({ reason: 'overall' });
  });

  it('does not judge with too little history', () => {
    expect(detectUnusual([{ id: 'x', amount: 99999, category: 'Travel' }], history.slice(0, 4))).toEqual([]);
  });
});

describe('analytics ranges and buckets', () => {
  const today = parseDateOnly('2026-11-16');

  it('resolves presets with an equal-length previous period', () => {
    const r = resolveRange({ range: '30d' }, today);
    expect(toDateOnly(r.start)).toBe('2026-10-18');
    expect(toDateOnly(r.end)).toBe('2026-11-17');
    expect(r).toMatchObject({ days: 30, granularity: 'day' });
    expect(toDateOnly(r.previous.start)).toBe('2026-09-18');

    expect(resolveRange({ range: '6m' }, today)).toMatchObject({ granularity: 'month' });
    expect(toDateOnly(resolveRange({ range: '6m' }, today).start)).toBe('2026-06-01');
    expect(resolveRange({ range: '90d' }, today).granularity).toBe('week');
  });

  it('truncates to Monday-based weeks and builds contiguous buckets', () => {
    expect(toDateOnly(truncate(parseDateOnly('2026-11-15'), 'week'))).toBe('2026-11-09'); // Sunday → Monday before
    expect(bucketKeys(parseDateOnly('2026-11-10'), parseDateOnly('2026-11-24'), 'week')).toEqual(['2026-11-09', '2026-11-16', '2026-11-23']);
    expect(bucketKeys(parseDateOnly('2026-10-15'), parseDateOnly('2026-12-02'), 'month')).toEqual(['2026-10-01', '2026-11-01', '2026-12-01']);
  });

  it('rejects empty or oversized custom ranges', () => {
    expect(() => resolveRange({ range: 'custom', from: '2020-01-01', to: '2026-11-16' }, today)).toThrow(/5 years/);
  });
});
