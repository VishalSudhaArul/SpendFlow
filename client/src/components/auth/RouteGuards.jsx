import { Navigate, Outlet, useLocation } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/auth.js';

function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status">
      <Loader2 className="size-7 animate-spin text-accent-ink" aria-hidden="true" />
      <span className="sr-only">Loading your account…</span>
    </div>
  );
}

/** Only signed-in users; others go to /login and come back afterwards. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'guest') {
    // Visitors opening the home page see the product first; deep links go to sign-in.
    if (location.pathname === '/') return <Navigate to="/welcome" replace />;
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/** Login/register pages: signed-in users are sent into the app. */
export function GuestOnly() {
  const { status } = useAuth();
  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}
