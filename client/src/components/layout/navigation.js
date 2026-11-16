import { Activity } from 'lucide-react';

/**
 * Sidebar sections. A module is added here only when its page and API exist,
 * so the navigation never links to unfinished features.
 */
export const NAV_SECTIONS = [
  {
    label: 'System',
    items: [{ to: '/status', label: 'System status', icon: Activity }],
  },
];
