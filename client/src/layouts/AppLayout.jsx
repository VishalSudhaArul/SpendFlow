import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { MobileDrawer } from '../components/layout/MobileDrawer.jsx';
import { Topbar } from '../components/layout/Topbar.jsx';
import { NAV_SECTIONS } from '../components/layout/navigation.js';

function useCurrentTitle() {
  const { pathname } = useLocation();
  for (const section of NAV_SECTIONS) {
    const match = section.items.find((item) => (item.exact ? pathname === item.to : pathname.startsWith(item.to)));
    if (match) return match.label;
  }
  return 'SpendFlow AI';
}

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const title = useCurrentTitle();

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Sidebar />
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-64">
        <Topbar title={title} onOpenMenu={() => setMenuOpen(true)} />
        <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <h1 className="mb-5 text-xl font-bold lg:hidden">{title}</h1>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
