export const BILL_STATE = {
  overdue: { label: 'Overdue', tone: 'danger' },
  due_soon: { label: 'Due soon', tone: 'warning' },
  upcoming: { label: 'Upcoming', tone: 'neutral' },
  paid: { label: 'Paid', tone: 'success' },
  skipped: { label: 'Skipped', tone: 'neutral' },
};

export const CYCLE_LABEL = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };

export function dueText(bill) {
  if (bill.state === 'paid' || bill.state === 'skipped') return null;
  const d = bill.daysUntilDue;
  if (d < 0) return `${Math.abs(d)} day${d === -1 ? '' : 's'} overdue`;
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  return `Due in ${d} days`;
}
