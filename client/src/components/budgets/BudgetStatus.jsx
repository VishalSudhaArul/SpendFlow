import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';

const STATUS = {
  ok: { label: 'On track', tone: 'success', icon: CheckCircle2 },
  warning: { label: 'Watch', tone: 'warning', icon: AlertTriangle },
  over: { label: 'Over budget', tone: 'danger', icon: XCircle },
};

/** Status always shows an icon + text, never color alone. */
export function BudgetStatusBadge({ status }) {
  const { label, tone, icon: Icon } = STATUS[status] ?? STATUS.ok;
  return (
    <Badge tone={tone}>
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </Badge>
  );
}

