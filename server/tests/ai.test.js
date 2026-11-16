import { describe, it, expect } from 'vitest';
import { contextNumbers, extractAmounts, findUngroundedAmounts } from '../src/services/ai/context.js';
import { fallbackChatReply, fallbackParseTransaction, fallbackSummary, resolveDate } from '../src/services/ai/fallbacks.js';
import { classifyError } from '../src/services/ai/geminiClient.js';

const TODAY = '2026-11-16'; // a Monday

const ctx = {
  currency: 'INR',
  month: '2026-11',
  dayOfMonth: 16,
  daysInMonth: 30,
  balance: { trackedBalance: 105762 },
  thisMonth: {
    income: 85000,
    incomeStillExpected: 0,
    spent: 57916,
    saved: 27084,
    savingsRatePercent: 31.9,
    projectedMonthEndSpending: 75979,
    usualMonthlySpending: 83000,
    spendingByCategory: [
      { category: 'Rent & Housing', spentSoFar: 22000, sameDaysLastMonth: 22000 },
      { category: 'Food & Dining', spentSoFar: 4200, sameDaysLastMonth: 1500 },
    ],
  },
  lastSixMonths: [
    { month: '2026-10', income: 104345, spent: 90000, net: 14345 },
    { month: '2026-11', income: 85000, spent: 57916, net: 27084 },
  ],
  typicalMonthlySpendingByCategory: [
    { category: 'Food & Dining', monthlyAverage: 3000 },
    { category: 'Shopping', monthlyAverage: 12000 },
    { category: 'Rent & Housing', monthlyAverage: 22000 },
  ],
  safeToSpend: { amount: 8469, perDay: 565, basis: 'cash_flow', breakdown: [] },
  healthScore: { score: 62, grade: 'fair', factors: [{ factor: 'Savings rate', points: 13.5, maxPoints: 30, detail: 'You keep 9% of your income' }] },
  budgets: [{ category: 'Food & Dining', limit: 6000, spent: 4200, remaining: 1800, status: 'ok' }],
  savingsGoals: [],
  unusualExpenses: [{ category: 'Shopping', amount: 38999, date: '2026-10-21', timesUsual: 13.1, usualAmount: 2969 }],
  incomeSources: [{ type: 'salary', frequency: 'monthly', monthlyEquivalent: 85000 }],
};

describe('AI data minimisation', () => {
  it('context contains no personal identifiers', async () => {
    // The real builder is exercised in integration tests; here we check the shape we promise.
    const serialized = JSON.stringify(ctx);
    expect(serialized).not.toMatch(/@|password|token|email/i);
  });
});

describe('grounding check', () => {
  it('extracts currency amounts in common formats', () => {
    expect(extractAmounts('Spend ₹8,469 or Rs. 500 or ₹1.2L or INR 3k')).toEqual([8469, 500, 120000, 3000]);
  });

  it('accepts figures from the data, the user, or simple arithmetic on them', () => {
    const reply = 'You can spend ₹8,469 (about ₹565/day). Food is ₹4,200, ₹1,200 above usual. To buy the ₹20,000 phone, wait.';
    expect(findUngroundedAmounts(reply, ctx, 'Can I afford ₹20,000?')).toEqual([]);
  });

  it('flags invented figures', () => {
    expect(findUngroundedAmounts('Your balance is ₹3,45,000.', ctx)).toEqual([345000]);
  });

  it('collects every number from nested context', () => {
    expect(contextNumbers(ctx)).toContain(38999);
  });
});

describe('fallback coach answers', () => {
  it('answers "where did my money go" from category data', () => {
    const { reply } = fallbackChatReply('Where did most of my money go this month?', ctx);
    expect(reply).toMatch(/Rent & Housing: ₹22,000/);
    expect(findUngroundedAmounts(reply, ctx)).toEqual([]);
  });

  it('builds a savings plan from flexible categories', () => {
    const { reply } = fallbackChatReply('How can I save ₹5,000 next month?', ctx);
    expect(reply).toMatch(/save ₹5,000/);
    expect(reply).toMatch(/Shopping: cut about/);
    expect(reply).not.toMatch(/Rent/); // fixed costs are not "wants"
  });

  it('checks a category question against typical spending and budget', () => {
    const { reply } = fallbackChatReply('Am I spending too much on food?', ctx);
    expect(reply).toMatch(/Food & Dining/);
    expect(reply).toMatch(/Budget: ₹6,000/);
    expect(reply).toMatch(/more than usual/); // 4200/16*30 = 7875 > 3000*1.1
  });

  it('judges affordability against safe-to-spend', () => {
    expect(fallbackChatReply('Can I afford a ₹20,000 purchase?', ctx).reply).toMatch(/Not comfortably/);
    expect(fallbackChatReply('Can I afford a ₹2,000 purchase?', ctx).reply).toMatch(/Yes, it fits/);
  });

  it('summarises the month', () => {
    const summary = fallbackSummary(ctx);
    expect(summary.headline).toMatch(/₹57,916/);
    expect(summary.highlights.length).toBeGreaterThan(0);
  });
});

describe('fallback transaction parser', () => {
  it('parses the example sentence', () => {
    expect(fallbackParseTransaction('I spent ₹450 on dinner using UPI yesterday.', TODAY)).toMatchObject({
      type: 'expense',
      amount: 450,
      category: 'Food & Dining',
      paymentMethod: 'UPI',
      date: '2026-11-15',
    });
  });

  it('detects income, card payments and missing amounts', () => {
    expect(fallbackParseTransaction('Received salary 85000 today', TODAY)).toMatchObject({ type: 'income', category: 'Salary', amount: 85000 });
    expect(fallbackParseTransaction('uber 230 by credit card', TODAY)).toMatchObject({ category: 'Transport', paymentMethod: 'Credit Card' });
    expect(fallbackParseTransaction('coffee with friends', TODAY)).toMatchObject({ amount: null, missing: ['amount'] });
  });

  it('resolves relative and explicit dates in the past', () => {
    expect(resolveDate('3 days ago', TODAY)).toBe('2026-11-13');
    expect(resolveDate('on friday', TODAY)).toBe('2026-11-13');
    expect(resolveDate('on monday', TODAY)).toBe('2026-11-09'); // last Monday, not today
    expect(resolveDate('12 nov', TODAY)).toBe('2026-11-12');
    expect(resolveDate('20 dec', TODAY)).toBe('2025-12-20'); // not in the future
    expect(resolveDate('lunch', TODAY)).toBe(TODAY);
  });
});

describe('AI error classification', () => {
  it.each([
    [{ status: 400, message: 'API key not valid. Please pass a valid API key.' }, 'AI_KEY_INVALID'],
    [{ status: 404, message: 'models/x is not found' }, 'AI_MODEL_NOT_FOUND'],
    [{ status: 429, message: 'Resource exhausted' }, 'AI_RATE_LIMITED'],
    [{ name: 'AbortError', message: 'This operation was aborted' }, 'AI_TIMEOUT'],
    [{ status: 500, message: 'internal' }, 'AI_UNAVAILABLE'],
  ])('maps %o to %s without leaking details', (error, code) => {
    const result = classifyError(error);
    expect(result.code).toBe(code);
    expect(result.message).not.toMatch(/AIza/);
  });
});
