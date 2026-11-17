import { Activity, ArrowLeftRight, BarChart3, FlaskConical, HandCoins, LayoutDashboard, PiggyBank, Sparkles, UserRound, WalletCards } from 'lucide-react';

/**
 * Sidebar sections. A module is added here only when its page and API exist,
 * so the navigation never links to unfinished features.
 * `exact` items match only their own path (the dashboard lives at "/").
 */
export const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/coach', label: 'AI Coach', icon: Sparkles },
    ],
  },
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
      { to: '/simulator', label: 'What-if simulator', icon: FlaskConical },
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
