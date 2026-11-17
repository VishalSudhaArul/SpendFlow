import { Link } from 'react-router';
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  Calculator,
  FlaskConical,
  Lock,
  MessageCircle,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { Logo } from '../components/layout/Logo.jsx';
import { ThemeToggle } from '../components/layout/ThemeToggle.jsx';
import { useAuth } from '../context/auth.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

const FEATURES = [
  { icon: ShieldCheck, title: 'Safe-to-spend, every day', text: 'One number that already accounts for upcoming bills, goal savings and a buffer — and shows its working.' },
  { icon: WalletCards, title: 'Budgets that warn early', text: 'Alerts when a category is on pace to overspend, not after. Plus a one-click 50/30/20 plan.' },
  { icon: CalendarClock, title: 'Bills & subscriptions', text: 'A calendar of every recurring payment, reminders before they are due, and one-tap “paid”.' },
  { icon: FlaskConical, title: 'What-if simulator', text: 'Try a raise, a spending cut or a ₹60,000 laptop on EMI before you commit, month by month.' },
  { icon: BarChart3, title: 'Analytics & heatmap', text: 'Trends, category shifts, weekday patterns and unusual expenses — with a table behind every chart.' },
  { icon: MessageCircle, title: 'An AI coach, grounded', text: 'Ask “Can I afford this?” in plain words. Google Gemini explains numbers SpendFlow has already calculated.' },
];

const PRINCIPLES = [
  { icon: Calculator, title: 'Numbers come from rules, not guesses', text: 'Totals, projections and the health score are computed by documented, tested rules on the server. The AI never invents a figure.' },
  { icon: Lock, title: 'Private by design', text: 'Your session lives in an httpOnly cookie, passwords are hashed, and the AI only ever sees a short aggregated summary — never your email or notes.' },
  { icon: Sparkles, title: 'Works without AI too', text: 'If the AI is unavailable, every feature still works and answers are calculated straight from your data.' },
];

export default function Landing() {
  const { status } = useAuth();
  usePageTitle(null);
  const signedIn = status === 'authenticated';

  return (
    <div className="min-h-dvh overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo to="/welcome" />
        <nav aria-label="Account" className="flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Link to="/" className="inline-flex h-10 items-center rounded-xl brand-gradient px-4 text-sm font-semibold text-white">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden h-10 items-center rounded-xl px-4 text-sm font-semibold hover:bg-surface-2 sm:inline-flex">
                Sign in
              </Link>
              <Link to="/register" className="inline-flex h-10 items-center rounded-xl brand-gradient px-4 text-sm font-semibold text-white">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-8 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 size-[40rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl brand-gradient" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <Sparkles className="size-3.5 text-accent-ink" aria-hidden="true" />
              Personal finance with an AI coach
            </p>
            <h1 className="mt-5 text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Know what you can <span className="brand-text">safely spend</span> — today.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              SpendFlow tracks your income, spending, budgets, bills and goals, then turns them into clear numbers and honest advice.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={signedIn ? '/' : '/register'}
                className="inline-flex h-12 items-center gap-2 rounded-xl brand-gradient px-5 font-semibold text-white shadow-[0_10px_30px_-10px_var(--accent-2)]"
              >
                {signedIn ? 'Go to your dashboard' : 'Create a free account'}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              {!signedIn && (
                <Link to="/login" className="inline-flex h-12 items-center rounded-xl border border-border bg-surface px-5 font-semibold hover:bg-surface-2">
                  I already have an account
                </Link>
              )}
            </div>
          </div>
          <ProductPreview />
        </section>

        {/* Features */}
        <section aria-labelledby="features" className="border-y border-border bg-surface/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 id="features" className="text-3xl font-bold tracking-tight">
              Everything your money needs, in one place
            </h2>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-2xl border border-border bg-surface p-6 shadow-card">
                  <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Principles */}
        <section aria-labelledby="principles" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 id="principles" className="text-3xl font-bold tracking-tight">
            Built to be trusted with your money
          </h2>
          <ul className="mt-10 grid gap-8 lg:grid-cols-3">
            {PRINCIPLES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl brand-gradient text-white">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
          {!signedIn && (
            <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-3xl border border-border bg-surface p-8 shadow-card sm:flex-row sm:items-center">
              <div>
                <p className="text-xl font-bold">Start with your next expense.</p>
                <p className="mt-1 text-sm text-muted">Type “450 dinner UPI yesterday” and SpendFlow fills in the rest for you to check.</p>
              </div>
              <Link to="/register" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl brand-gradient px-5 font-semibold text-white">
                Create your account
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} SpendFlow AI · A personal portfolio project</p>
          <p>SpendFlow is not a bank or a licensed financial adviser.</p>
        </div>
      </footer>
    </div>
  );
}

/** A static, decorative illustration of the dashboard (not real data). */
function ProductPreview() {
  const bars = [62, 48, 70, 55, 80, 66, 74];
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md select-none">
      <div className="rounded-3xl border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4 text-accent-ink" />
          Safe to spend this month
        </div>
        <p className="tabular mt-2 text-4xl font-extrabold tracking-tight">₹14,250</p>
        <p className="mt-1 text-sm text-muted">About ₹950 a day for the next 15 days.</p>
        <div className="mt-5 flex h-24 items-end gap-2">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: i === bars.length - 1 ? 'var(--accent)' : 'var(--surface-2)' }} />
          ))}
        </div>
      </div>
      <div className="absolute -bottom-8 -left-4 w-56 rounded-2xl border border-border bg-surface p-4 shadow-card sm:-left-10">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <PiggyBank className="size-4 text-accent-ink" />
          Emergency fund
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full w-3/5 rounded-full brand-gradient" />
        </div>
        <p className="mt-1.5 text-xs text-muted">60% · on track</p>
      </div>
      <div className="absolute -top-6 -right-2 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card sm:-right-8">
        <p className="text-xs text-muted">Health score</p>
        <p className="tabular text-2xl font-extrabold text-success">78</p>
      </div>
    </div>
  );
}
