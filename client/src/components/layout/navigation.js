import { Activity, ArrowLeftRight, HandCoins, PiggyBank, UserRound, WalletCards } from 'lucide-react';

/**
 * Sidebar sections. A module is added here only when its page and API exist,
 * so the navigation never links to unfinished features.
 */
export const NAV_SECTIONS = [
  {
    label: 'Money',
    items: [
      { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
      { to: '/income', label: 'Income', icon: HandCoins },
    ],
  },
  {
    label: 'Plan',
    items: [
      { to: '/budgets', label: 'Budgets', icon: WalletCards },
      { to: '/goals', label: 'Savings goals', icon: PiggyBank },
    ],
  },
  {
    label: 'Account',
    items: [{ to: '/profile', label: 'Profile & security', icon: UserRound }],
  },
  {
    label: 'System',
    items: [{ to: '/status', label: 'System status', icon: Activity }],
  },
];
