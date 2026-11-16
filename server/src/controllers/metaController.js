import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  INCOME_FREQUENCIES,
  INCOME_SOURCE_TYPES,
  NEEDS_CATEGORIES,
  PAYMENT_METHODS,
  SAVINGS_CATEGORIES,
  WANTS_CATEGORIES,
} from '../constants/finance.js';
import { SUPPORTED_CURRENCIES } from '../models/User.js';
import { GOAL_ICONS } from '../models/SavingsGoal.js';
import { sendSuccess } from '../utils/response.js';

export function getMeta(_req, res) {
  res.set('Cache-Control', 'private, max-age=3600');
  sendSuccess(res, {
    categories: { expense: EXPENSE_CATEGORIES, income: INCOME_CATEGORIES },
    paymentMethods: PAYMENT_METHODS,
    incomeSourceTypes: INCOME_SOURCE_TYPES,
    incomeFrequencies: INCOME_FREQUENCIES,
    currencies: SUPPORTED_CURRENCIES,
    goalIcons: GOAL_ICONS,
    budgetBuckets: { needs: NEEDS_CATEGORIES, wants: WANTS_CATEGORIES, savings: SAVINGS_CATEGORIES },
  });
}
