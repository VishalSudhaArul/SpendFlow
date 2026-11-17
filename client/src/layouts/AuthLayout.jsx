import { Outlet } from 'react-router';
import { LineChart, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { Logo } from '../components/layout/Logo.jsx';
import { ThemeToggle } from '../components/layout/ThemeToggle.jsx';

const HIGHLIGHTS = [
  { icon: LineChart, title: 'See where money goes', text: 'Clear breakdowns of spending, income and savings over time.' },
  { icon: Target, title: 'Plan with intent', text: 'Budgets, savings goals and a what-if simulator for big decisions.' },
  { icon: Sparkles, title: 'An AI coach grounded in your numbers', text: 'Totals are calculated by SpendFlow. The AI explains them.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Your data is visible only to you.' },
];

export function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden overflow-hidden border-r border-border bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -left-32 size-[34rem] rounded-full opacity-25 blur-3xl brand-gradient"
        />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl leading-tight font-extrabold tracking-tight">
            Money that makes sense, <span className="brand-text">every month.</span>
          </h2>
          <ul className="mt-10 space-y-6">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-0.5 text-sm text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-muted">© {new Date().getFullYear()} SpendFlow AI</p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <div className="lg:invisible">
            <Logo />
          </div>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
