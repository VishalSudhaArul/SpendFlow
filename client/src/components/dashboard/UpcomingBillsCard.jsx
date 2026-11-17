import { Link } from 'react-router';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import { BILL_STATE, dueText } from '../bills/billVisuals.js';
import { useMoney } from '../../hooks/useMoney.js';
import { formatShortDate } from '../../utils/format.js';

export function UpcomingBillsCard({ upcoming }) {
  const money = useMoney();
  return (
    <Card>
      <CardHeader
        title="Upcoming bills"
        description={upcoming.dueThisMonth ? `${money(upcoming.dueThisMonth, { decimals: 0 })} still due this month` : 'Next 14 days'}
        action={
          <Link to="/bills" className="flex shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:underline">
            See all
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        }
      />
      {upcoming.items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <CalendarClock className="size-4" aria-hidden="true" />
          Nothing due in the next 14 days.
        </p>
      ) : (
        <ul className="space-y-3">
          {upcoming.items.map((bill) => (
            <li key={bill.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{bill.name}</p>
                <p className="text-xs text-muted">
                  {formatShortDate(bill.dueDate)} · {dueText(bill)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="tabular font-semibold">{money(bill.amount, { decimals: 0 })}</span>
                {(bill.state === 'overdue' || bill.state === 'due_soon') && <Badge tone={BILL_STATE[bill.state].tone}>{BILL_STATE[bill.state].label}</Badge>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
