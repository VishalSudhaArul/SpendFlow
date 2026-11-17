import { Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { MobileDrawer } from '../components/layout/MobileDrawer.jsx';
import { Topbar } from '../components/layout/Topbar.jsx';
import { NAV_SECTIONS } from '../components/layout/navigation.js';
import { ErrorBoundary } from '../components/ErrorBoundary.jsx';
import { PageLoader } from '../components/ui/PageLoader.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

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
  const { pathname } = useLocation();
  const title = useCurrentTitle();
  const mainRef = useRef(null);
  const firstRender = useRef(true);
  usePageTitle(title);

  // On navigation: start at the top and move focus to the new page, so
  // keyboard and screen-reader users land on the content (not the old link).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

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
        <main
          id="main"
          ref={mainRef}
          tabIndex={-1}
          aria-label={title}
          className="mx-auto w-full max-w-7xl px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          <h1 className="mb-5 text-xl font-bold lg:hidden">{title}</h1>
          <ErrorBoundary resetKey={pathname}>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
