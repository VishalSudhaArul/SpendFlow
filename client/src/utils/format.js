const currencyFormatters = new Map();

/** Formats a number as currency, e.g. formatCurrency(1234.5) -> "₹1,234.50". */
export function formatCurrency(amount, currency = 'INR', { compact = false } = {}) {
  const key = `${currency}-${compact}`;
  if (!currencyFormatters.has(key)) {
    currencyFormatters.set(
      key,
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        notation: compact ? 'compact' : 'standard',
        maximumFractionDigits: compact ? 1 : 2,
      }),
    );
  }
  return currencyFormatters.get(key).format(Number(amount) || 0);
}

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

export function formatPercent(value, digits = 0) {
  return `${(Number(value) || 0).toFixed(digits)}%`;
}
