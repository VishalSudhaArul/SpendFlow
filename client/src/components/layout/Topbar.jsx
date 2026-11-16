import { Menu } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle.jsx';
import { Logo } from './Logo.jsx';
import { UserMenu } from './UserMenu.jsx';

export function Topbar({ title, onOpenMenu }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border glass">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          className="grid size-10 place-items-center rounded-xl border border-border bg-surface text-muted hover:text-text lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </button>
        <div className="lg:hidden">
          <Logo />
        </div>
        <h1 className="hidden text-lg font-semibold lg:block">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
