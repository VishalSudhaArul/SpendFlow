/** One-line explanation of why a budget has its status. */
export function budgetReasonText(budget, money) {
  switch (budget.reason) {
    case 'over_limit':
      return `${money(Math.abs(budget.remaining))} over the limit`;
    case 'threshold_reached':
      return `${Math.round(budget.percent)}% of the limit used`;
    case 'on_pace_to_exceed':
      return `On pace to spend ${money(budget.projected)} this month`;
    default:
      return null;
  }
}
