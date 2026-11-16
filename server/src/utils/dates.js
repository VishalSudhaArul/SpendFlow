/**
 * Transactions are calendar days, not instants. They are stored as midnight UTC
 * of the chosen day ("2026-11-16" -> 2026-11-16T00:00:00.000Z), and every
 * range/month calculation uses UTC, so a date never shifts with the server's
 * or user's timezone.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(value) {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function parseDateOnly(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export function todayUtc() {
  return parseDateOnly(new Date().toISOString().slice(0, 10));
}

export function endOfDayUtc(date) {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function startOfMonthUtc(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addMonthsUtc(date, months) {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  // Keep the day of month, clamped to the target month's length (Jan 31 + 1 month = Feb 28/29).
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return result;
}

export function addDaysUtc(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** "2026-11" style key for grouping by month. */
export function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

/** Advances a date by one period of an income/billing frequency. */
export function advanceByFrequency(date, frequency) {
  switch (frequency) {
    case 'weekly':
      return addDaysUtc(date, 7);
    case 'biweekly':
      return addDaysUtc(date, 14);
    case 'monthly':
      return addMonthsUtc(date, 1);
    case 'quarterly':
      return addMonthsUtc(date, 3);
    case 'yearly':
      return addMonthsUtc(date, 12);
    default:
      return null;
  }
}
