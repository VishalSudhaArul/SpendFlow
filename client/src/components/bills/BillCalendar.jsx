import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { useMoney } from '../../hooks/useMoney.js';
import { formatMonthLong } from '../../utils/months.js';
import { cn } from '../../utils/cn.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STATE_DOT = {
  overdue: 'bg-danger',
  due_soon: 'bg-warning',
  upcoming: 'bg-accent',
  paid: 'bg-success',
  skipped: 'bg-muted',
};

/**
 * Month grid with the bills due on each day. Selecting a day filters the list
 * next to it. Each day button has a full text label for screen readers.
 */
export function BillCalendar({ month, onMonthChange, bills, selectedDay, onSelectDay, today }) {
  const money = useMoney();
  const [year, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const leading = (first.getUTCDay() + 6) % 7; // Monday-first grid

  const byDay = new Map();
  for (const bill of bills) {
    const key = String(bill.dueDate).slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(bill);
  }

  const cells = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const shift = (delta) => {
    const d = new Date(Date.UTC(year, m - 1 + delta, 1));
    onMonthChange(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous month">
          <ChevronLeft className="size-4" />
        </Button>
        <p className="font-semibold" aria-live="polite">
          {formatMonthLong(month)}
        </p>
        <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next month">
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold tracking-wide text-muted uppercase">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1">
            {d.slice(0, 2)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <span key={`blank-${i}`} />;
          const key = `${month}-${String(day).padStart(2, '0')}`;
          const dayBills = byDay.get(key) ?? [];
          const total = dayBills.reduce((s, b) => s + (b.paidAmount ?? b.amount), 0);
          const isToday = key === today;
          const selected = key === selectedDay;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(selected ? null : key)}
              aria-pressed={selected}
              className={cn(
                'flex aspect-square min-h-11 flex-col items-center justify-start rounded-lg border p-1 text-xs transition',
                selected ? 'border-accent bg-accent-soft' : 'border-transparent hover:bg-surface-2',
                dayBills.length > 0 && !selected && 'bg-surface-2/60',
              )}
            >
              <span className={cn('tabular grid size-6 place-items-center rounded-full', isToday && 'bg-accent font-bold text-white')}>{day}</span>
              {/* The accessible name keeps the visible day number first, then the details. */}
              <span className="sr-only">
                {` ${formatMonthLong(month)}${isToday ? ', today' : ''}${dayBills.length ? `, ${dayBills.length} bill${dayBills.length > 1 ? 's' : ''}, ${money(total, { decimals: 0 })}` : ''}`}
              </span>
              {dayBills.length > 0 && (
                <>
                  <span className="mt-0.5 flex gap-0.5" aria-hidden="true">
                    {dayBills.slice(0, 3).map((b) => (
                      <span key={b.id} className={cn('size-1.5 rounded-full', STATE_DOT[b.state])} />
                    ))}
                  </span>
                  <span className="tabular mt-auto hidden text-[10px] font-medium text-muted sm:block" aria-hidden="true">
                    {money(total, { compact: true })}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {[
          ['overdue', 'Overdue'],
          ['due_soon', 'Due soon'],
          ['upcoming', 'Upcoming'],
          ['paid', 'Paid'],
        ].map(([state, label]) => (
          <span key={state} className="flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', STATE_DOT[state])} aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
