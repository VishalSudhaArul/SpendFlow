import { useState } from 'react';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { useMoney } from '../../hooks/useMoney.js';
import { cn } from '../../utils/cn.js';

const BASIS_NOTE = {
  cash_flow: 'After upcoming fixed costs, goal savings and a 5% buffer.',
  budget_cap: 'Limited by what is left in your monthly budget.',
  budget_only: 'Based on your monthly budget — add income for a fuller picture.',
};

export function SafeToSpendCard({ safe, daysLeft }) {
  const money = useMoney();
  const [open, setOpen] = useState(false);

  return (
    <Card className="relative flex flex-col overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 size-64 rounded-full opacity-20 blur-3xl brand-gradient" />
      <div className="relative flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4 text-accent-ink" aria-hidden="true" />
        Safe to spend this month
      </div>

      {safe.amount === null ? (
        <div className="relative mt-4">
          <p className="text-3xl font-extrabold">—</p>
          <p className="mt-2 text-sm text-muted">Add your income or set a monthly budget to see how much you can safely spend.</p>
        </div>
      ) : (
        <div className="relative mt-3">
          <p className="tabular text-4xl font-extrabold tracking-tight sm:text-5xl">{money(safe.amount, { decimals: 0 })}</p>
          <p className="mt-2 text-sm text-muted">
            About <span className="tabular font-semibold text-text">{money(safe.perDay, { decimals: 0 })}</span> a day for the next {daysLeft}{' '}
            {daysLeft === 1 ? 'day' : 'days'}. {BASIS_NOTE[safe.basis]}
          </p>
        </div>
      )}

      {safe.breakdown.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="relative mt-4 flex items-center gap-1 self-start text-xs font-semibold text-accent-ink hover:underline"
          >
            How is this calculated?
            <ChevronDown className={cn('size-3.5 transition', open && 'rotate-180')} aria-hidden="true" />
          </button>
          {open && (
            <dl className="relative mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
              {safe.breakdown.map((row) => (
                <div key={row.key} className="flex justify-between gap-3">
                  <dt className="text-muted">{row.label}</dt>
                  <dd className={cn('tabular font-medium', row.amount < 0 && 'text-danger')}>
                    {row.amount < 0 ? '−' : row.key === 'budget_cap' ? '' : '+'}
                    {money(Math.abs(row.amount), { decimals: 0 })}
                  </dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-border pt-1.5 font-semibold">
                <dt>Safe to spend</dt>
                <dd className="tabular">{money(safe.amount, { decimals: 0 })}</dd>
              </div>
            </dl>
          )}
        </>
      )}
    </Card>
  );
}
