import { NavLink } from 'react-router';
import { Logo } from './Logo.jsx';
import { NAV_SECTIONS } from './navigation.js';
import { cn } from '../../utils/cn.js';

/** Navigation list shared by the desktop sidebar and the mobile drawer. */
export function SidebarContent({ onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-6">
            <p className="px-3 pb-2 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">{section.label}</p>
            <ul className="space-y-1">
              {section.items.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                        isActive ? 'bg-accent-soft text-text' : 'text-muted hover:bg-surface-2 hover:text-text',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full brand-gradient" />
                        )}
                        <Icon className={cn('size-[18px]', isActive && 'text-accent')} aria-hidden="true" />
                        {label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:block">
      <SidebarContent />
    </aside>
  );
}
