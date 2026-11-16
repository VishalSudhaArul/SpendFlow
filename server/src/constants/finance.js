/**
 * Single source of truth for financial enums. The client fetches these from
 * GET /api/meta so the two never drift apart.
 */

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transport',
  'Shopping',
  'Bills & Utilities',
  'Rent & Housing',
  'Health & Fitness',
  'Entertainment',
  'Travel',
  'Education',
  'Subscriptions',
  'Personal Care',
  'Gifts & Donations',
  'Investments',
  'EMI & Loans',
  'Other',
];

export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investments', 'Rental', 'Refund', 'Gift', 'Other'];

export const PAYMENT_METHODS = ['UPI', 'Debit Card', 'Credit Card', 'Cash', 'Net Banking', 'Wallet', 'Bank Transfer', 'Other'];

export const TRANSACTION_TYPES = ['expense', 'income'];

export const INCOME_SOURCE_TYPES = ['salary', 'freelance', 'business', 'investment', 'rental', 'other'];

/** Income source type → category used for the income transactions it produces. */
export const INCOME_TYPE_CATEGORY = {
  salary: 'Salary',
  freelance: 'Freelance',
  business: 'Business',
  investment: 'Investments',
  rental: 'Rental',
  other: 'Other',
};

export const INCOME_FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'irregular'];

/** How many times per month each frequency occurs on average (for monthly normalization). */
export const FREQUENCY_PER_MONTH = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
  irregular: 0,
};

/**
 * 50/30/20 rule buckets. "Needs" are essentials, "wants" are discretionary.
 * Investments count toward the 20% savings bucket, not spending.
 */
export const NEEDS_CATEGORIES = [
  'Rent & Housing',
  'Groceries',
  'Bills & Utilities',
  'Transport',
  'Health & Fitness',
  'EMI & Loans',
  'Education',
];
export const WANTS_CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Entertainment',
  'Travel',
  'Subscriptions',
  'Personal Care',
  'Gifts & Donations',
  'Other',
];
export const SAVINGS_CATEGORIES = ['Investments'];

/**
 * Categories normally paid once a month (not spread across days). Month-end
 * projections count them as-is instead of extrapolating them.
 */
export const FIXED_CATEGORIES = ['Rent & Housing', 'EMI & Loans', 'Bills & Utilities', 'Subscriptions', 'Investments', 'Education'];

export function categoriesFor(type) {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export const MAX_AMOUNT = 1_000_000_000; // 100 crore — guards against typos and overflow
