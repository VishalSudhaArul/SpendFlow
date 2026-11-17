import { describe, it, expect } from 'vitest';
import { billState, monthlyCost, nextAfter, occurrencesUntil } from '../src/services/finance/recurring.js';
import { createSubscriptionSchema } from '../src/validators/billValidators.js';
import { parseDateOnly, toDateOnly, todayUtc, addDaysUtc } from '../src/utils/dates.js';

const d = parseDateOnly;
const today = d('2026-11-17');

describe('recurring payment maths', () => {
  it('normalises costs to a monthly figure', () => {
    expect(monthlyCost(649, 'monthly')).toBe(649);
    expect(monthlyCost(9000, 'yearly')).toBe(750);
    expect(monthlyCost(1200, 'quarterly')).toBe(400);
    expect(monthlyCost(100, 'weekly')).toBe(433.33);
  });

  it('lists occurrences up to a date, clamping month-end days', () => {
    expect(occurrencesUntil(d('2026-11-30'), 'monthly', d('2027-03-01')).map(toDateOnly)).toEqual(['2026-11-30', '2026-12-30', '2027-01-30', '2027-02-28']);
    expect(occurrencesUntil(d('2026-12-01'), 'yearly', d('2027-06-01')).map(toDateOnly)).toEqual(['2026-12-01']);
  });

  it('finds the next due date after a paid one', () => {
    expect(toDateOnly(nextAfter(d('2026-11-12'), 'monthly', d('2026-11-12')))).toBe('2026-12-12');
    expect(toDateOnly(nextAfter(d('2026-09-12'), 'monthly', d('2026-11-12')))).toBe('2026-12-12'); // catches up
  });

  it('classifies bill states', () => {
    expect(billState({ status: 'upcoming', dueDate: d('2026-11-15') }, today)).toBe('overdue');
    expect(billState({ status: 'upcoming', dueDate: d('2026-11-19'), reminderDaysBefore: 3 }, today)).toBe('due_soon');
    expect(billState({ status: 'upcoming', dueDate: d('2026-11-17'), reminderDaysBefore: 0 }, today)).toBe('due_soon'); // due today
    expect(billState({ status: 'upcoming', dueDate: d('2026-11-30'), reminderDaysBefore: 3 }, today)).toBe('upcoming');
    expect(billState({ status: 'paid', dueDate: d('2026-11-01') }, today)).toBe('paid');
  });
});

describe('subscription validation', () => {
  it('rejects a first due date far in the past', () => {
    const old = toDateOnly(addDaysUtc(todayUtc(), -60));
    expect(createSubscriptionSchema.safeParse({ name: 'X', amount: 100, nextDueDate: old }).success).toBe(false);
    expect(createSubscriptionSchema.safeParse({ name: 'X', amount: 100, nextDueDate: toDateOnly(todayUtc()) }).success).toBe(true);
  });
});
