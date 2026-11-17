/**
 * Pure helpers for recurring payments (no database).
 */
import { CYCLES_PER_MONTH } from '../../models/Subscription.js';
import { advanceByFrequency } from '../../utils/dates.js';
import { roundMoney } from '../../utils/money.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Average monthly cost of a recurring payment (weekly ×52/12, yearly ÷12, …). */
export function monthlyCost(amount, cycle) {
  return roundMoney(amount * (CYCLES_PER_MONTH[cycle] ?? 0));
}

/** Due dates from `firstDue` up to and including `until` (capped for safety). */
export function occurrencesUntil(firstDue, cycle, until, max = 60) {
  const dates = [];
  let date = new Date(firstDue);
  while (date <= until && dates.length < max) {
    dates.push(date);
    date = advanceByFrequency(date, cycle);
  }
  return dates;
}

/** First due date strictly after `date`, starting from `from`. */
export function nextAfter(from, cycle, date) {
  let next = new Date(from);
  let guard = 0;
  while (next <= date && guard < 1000) {
    next = advanceByFrequency(next, cycle);
    guard += 1;
  }
  return next;
}

/**
 * Display state of a bill relative to today:
 *  paid | skipped | overdue (past due) | due_soon (within its reminder window) | upcoming
 */
export function billState(bill, today) {
  if (bill.status === 'paid' || bill.status === 'skipped') return bill.status;
  const due = new Date(bill.dueDate);
  if (due < today) return 'overdue';
  const days = Math.round((due - today) / DAY_MS);
  return days <= (bill.reminderDaysBefore ?? 3) ? 'due_soon' : 'upcoming';
}

export function daysUntil(date, today) {
  return Math.round((new Date(date) - today) / DAY_MS);
}
