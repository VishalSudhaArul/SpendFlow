import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../../context/auth.js';

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true });
  }

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface pr-2.5 pl-1 text-sm hover:bg-surface-2"
      >
        <span className="grid size-8 place-items-center rounded-lg brand-gradient text-xs font-bold text-white">
          {initials(user.name)}
        </span>
        <span className="hidden max-w-32 truncate font-medium sm:block">{user.name}</span>
        <ChevronDown className="size-4 text-muted" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-card"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link
            role="menuitem"
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
          >
            <UserRound className="size-4 text-muted" aria-hidden="true" />
            Profile & security
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger/8"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
