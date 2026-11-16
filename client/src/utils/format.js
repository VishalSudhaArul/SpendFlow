const currencyFormatters = new Map();

/** Formats a number as currency, e.g. formatCurrency(1234.5) -> "₹1,234.50". */
export function formatCurrency(amount, currency = 'INR', { compact = false, decimals } = {}) {
  const key = `${currency}-${compact}-${decimals}`;
  if (!currencyFormatters.has(key)) {
    currencyFormatters.set(
      key,
      new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
        style: 'currency',
        currency,
        notation: compact ? 'compact' : 'standard',
        minimumFractionDigits: decimals ?? (compact ? 0 : undefined),
        maximumFractionDigits: decimals ?? (compact ? 1 : 2),
      }),
    );
  }
  return currencyFormatters.get(key).format(Number(amount) || 0);
}

// Transaction dates are calendar days stored as midnight UTC, so they are
// formatted in UTC to show exactly the day the user picked.
const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const shortDateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthFormatter = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(value) {
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

export function formatShortDate(value) {
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? '—' : shortDateFormatter.format(date);
}

/** "2026-11" -> "Nov 26" */
export function formatMonthKey(key) {
  return monthFormatter.format(new Date(`${key}-01T00:00:00.000Z`));
}

export function formatPercent(value, digits = 0) {
  return `${(Number(value) || 0).toFixed(digits)}%`;
}

/** Today's date in the user's own timezone as YYYY-MM-DD (for <input type="date">). */
export function todayInputValue() {
  return new Date().toLocaleDateString('en-CA');
}

/** Stored ISO date -> YYYY-MM-DD for <input type="date">. */
export function toInputDate(value) {
  return value ? String(value).slice(0, 10) : '';
}

export function capitalize(text = '') {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
