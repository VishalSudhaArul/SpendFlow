import { Activity, UserRound } from 'lucide-react';

/**
 * Sidebar sections. A module is added here only when its page and API exist,
 * so the navigation never links to unfinished features.
 */
export const NAV_SECTIONS = [
  {
    label: 'Account',
    items: [{ to: '/profile', label: 'Profile & security', icon: UserRound }],
  },
  {
    label: 'System',
    items: [{ to: '/status', label: 'System status', icon: Activity }],
  },
];
