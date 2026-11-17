import { HandCoins, Percent, PiggyBank, Receipt, ShoppingBag } from 'lucide-react';

export const SCENARIO_TYPES = {
  category_change: { label: 'Change spending in a category', icon: Percent },
  income_change: { label: 'Change my income', icon: HandCoins },
  recurring_saving: { label: 'Save a fixed amount every month', icon: PiggyBank },
  recurring_expense: { label: 'Add a new monthly expense', icon: Receipt },
  one_time_purchase: { label: 'Make a one-time purchase', icon: ShoppingBag },
};

export function newScenario(type, baselineCategories = []) {
  switch (type) {
    case 'category_change':
      return { type, category: baselineCategories[0]?.category ?? 'Food & Dining', percent: -10 };
    case 'income_change':
      return { type, percent: 10 };
    case 'recurring_saving':
      return { type, amount: 2000 };
    case 'recurring_expense':
      return { type, amount: 999, label: 'Subscription' };
    default:
      return { type: 'one_time_purchase', amount: 60000, label: 'Laptop', month: 1 };
  }
}
