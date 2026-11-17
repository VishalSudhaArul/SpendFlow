import { describe, it, expect } from 'vitest';
import { applyRecurring, emi, oneTimeSchedule, simulate } from '../src/services/finance/simulation.js';
import { simulationSchema } from '../src/validators/simulatorValidators.js';

const baseline = {
  income: 80000,
  categories: [
    { category: 'Rent & Housing', amount: 20000 },
    { category: 'Food & Dining', amount: 10000 },
    { category: 'Shopping', amount: 8000 },
    { category: 'Transport', amount: 2000 },
  ],
};
// Typical month: income 80,000, spending 40,000, surplus 40,000.

const monthKeys = (n) => Array.from({ length: n }, (_, i) => `2027-${String(i + 1).padStart(2, '0')}`);
const context = (n = 12, extra = {}) => ({ startBalance: 50000, monthKeys: monthKeys(n), budgets: { overall: 45000, categories: { 'Food & Dining': 9000 } }, goalsRequiredMonthly: 10000, emergencyMonths: 1, ...extra });

describe('the four example scenarios', () => {
  it('reduce food expenses by 15%', () => {
    const result = simulate({ baseline, scenarios: [{ type: 'category_change', category: 'Food & Dining', percent: -15 }], context: context() });
    expect(result.simulated).toMatchObject({ expense: 38500, net: 41500 });
    expect(result.summary).toMatchObject({ monthlyNetChange: 1500, difference: 18000 }); // 1,500 × 12
    expect(result.categories.find((c) => c.category === 'Food & Dining')).toMatchObject({ baseline: 10000, simulated: 8500, change: -1500 });
    // Food goes from over its ₹9,000 budget to within it (above 90%, so "tight").
    expect(result.budgetImpact.find((b) => b.category === 'Food & Dining')).toMatchObject({ baselineStatus: 'over', simulatedStatus: 'tight', remaining: 500 });
  });

  it('save ₹2,000 every month', () => {
    const result = simulate({ baseline, scenarios: [{ type: 'recurring_saving', amount: 2000 }], context: context() });
    expect(result.simulated).toMatchObject({ net: 40000, plannedSavings: 2000, unallocated: 38000 });
    expect(result.summary).toMatchObject({ plannedSavingsTotal: 24000, difference: 0 }); // committed, not new money
    expect(result.insights.join(' ')).toMatch(/fits/);
  });

  it('salary increases by 10%', () => {
    const result = simulate({ baseline, scenarios: [{ type: 'income_change', percent: 10 }], context: context(12) });
    expect(result.simulated).toMatchObject({ income: 88000, net: 48000, savingsRate: 54.5 });
    expect(result.summary.simulatedEndBalance).toBe(50000 + 48000 * 12);
  });

  it('buy a ₹60,000 laptop', () => {
    const result = simulate({ baseline, scenarios: [{ type: 'one_time_purchase', amount: 60000, label: 'Laptop', month: 1 }], context: context(3) });
    expect(result.projection[0].simulated).toMatchObject({ expense: 100000, net: -20000, balance: 30000, oneTime: 60000 });
    expect(result.projection[1].simulated.net).toBe(40000); // back to normal afterwards
    expect(result.summary).toMatchObject({ difference: -60000, lowestBalance: { amount: 30000, month: '2027-01' }, goesNegative: false });
    expect(result.insights.join(' ')).toMatch(/Laptop equals about 2 month/);
  });
});

describe('EMIs and combinations', () => {
  it('computes standard EMIs', () => {
    expect(emi(60000, 0, 6)).toBe(10000);
    expect(emi(100000, 12, 12)).toBe(8884.88); // known value for 12% p.a., 12 months
  });

  it('spreads a financed purchase over its instalments and reports interest', () => {
    const { schedule, purchases } = oneTimeSchedule([{ type: 'one_time_purchase', amount: 100000, month: 2, emiMonths: 12, annualInterestRate: 12, label: 'Bike' }], 6);
    expect(schedule[0]).toEqual([]);
    expect(schedule[1][0]).toMatchObject({ amount: 8884.88, label: 'Bike (EMI 1/12)' });
    expect(purchases[0]).toMatchObject({ installment: 8884.88, totalPaid: 106618.56, interest: 6618.56 });
  });

  it('combines several changes', () => {
    const recurring = applyRecurring(baseline, [
      { type: 'category_change', category: 'Shopping', percent: -50 },
      { type: 'recurring_expense', amount: 999, label: 'Gym' },
      { type: 'income_change', amount: 5000 },
    ]);
    expect(recurring).toMatchObject({ income: 85000, expense: 36999, net: 48001 });
  });

  it('warns when the balance would go negative', () => {
    const result = simulate({ baseline, scenarios: [{ type: 'one_time_purchase', amount: 200000, month: 1 }], context: context(3) });
    expect(result.summary.goesNegative).toBe(true);
    expect(result.insights.some((i) => i.startsWith('⚠'))).toBe(true);
  });

  it('flags planned savings the surplus cannot fund', () => {
    const result = simulate({ baseline, scenarios: [{ type: 'recurring_saving', amount: 50000 }], context: context() });
    expect(result.simulated.unallocated).toBe(-10000);
    expect(result.insights.join(' ')).toMatch(/more than your monthly surplus/);
  });
});

describe('scenario validation', () => {
  it('accepts valid scenarios and rejects invalid ones', () => {
    expect(simulationSchema.safeParse({ scenarios: [{ type: 'category_change', category: 'Food & Dining', percent: -15 }] }).success).toBe(true);
    expect(simulationSchema.safeParse({ scenarios: [] }).success).toBe(false);
    expect(simulationSchema.safeParse({ scenarios: [{ type: 'category_change', category: 'Salary', percent: 10 }] }).success).toBe(false);
    expect(simulationSchema.safeParse({ scenarios: [{ type: 'income_change' }] }).success).toBe(false);
    expect(simulationSchema.safeParse({ scenarios: [{ type: 'one_time_purchase', amount: -5 }] }).success).toBe(false);
    expect(simulationSchema.safeParse({ scenarios: [{ type: 'hack_the_planet' }] }).success).toBe(false);
  });
});
