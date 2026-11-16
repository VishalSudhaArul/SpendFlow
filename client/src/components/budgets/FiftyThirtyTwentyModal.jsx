import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Alert } from '../ui/Alert.jsx';
import { ProgressBar } from '../ui/ProgressBar.jsx';
import { inputClass } from '../ui/FormField.jsx';
import { useMoney } from '../../hooks/useMoney.js';
import { useToast } from '../../context/toast.js';
import { budgetService } from '../../services/financeServices.js';
import { cn } from '../../utils/cn.js';
import { formatMonthLong } from '../../utils/months.js';

const BASIS_TEXT = {
  provided: 'the income you entered',
  income_sources: 'expected income from your active income sources',
  recent_income: 'your average income over the last 3 months',
};

const BUCKETS = [
  { key: 'needs', label: 'Needs', text: 'Rent, groceries, bills, transport, EMIs' },
  { key: 'wants', label: 'Wants', text: 'Dining out, shopping, entertainment, travel' },
  { key: 'savings', label: 'Savings', text: 'Investments, goals and everything left unspent' },
];

export function FiftyThirtyTwentyModal({ open, onClose, month, onApplied }) {
  const money = useMoney();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="50/30/20 budget plan"
      description="50% of income for needs, 30% for wants, 20% for savings."
      size="lg"
    >
      {/* Mounted fresh each time the dialog opens (Modal renders children only while open). */}
      <PlanContent month={month} money={money} onClose={onClose} onApplied={onApplied} />
    </Modal>
  );
}

function PlanContent({ month, money, onClose, onApplied }) {
  const toast = useToast();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [incomeInput, setIncomeInput] = useState('');
  const [applying, setApplying] = useState(false);

  function fetchPlan(income) {
    return budgetService
      .fiftyThirtyTwenty(month, income)
      .then((result) => {
        setPlan(result);
        setError(null);
      })
      .catch((err) => {
        setPlan(null);
        setError(err);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on open
  }, []);

  function load(income) {
    setLoading(true);
    fetchPlan(income);
  }

  async function apply() {
    const items = [
      { category: null, limit: plan.needs.target + plan.wants.target },
      ...plan.needs.categories.map((c) => ({ category: c.category, limit: c.suggestedLimit })),
      ...plan.wants.categories.map((c) => ({ category: c.category, limit: c.suggestedLimit })),
    ];
    setApplying(true);
    try {
      await budgetService.bulk(month, items);
      toast.success('50/30/20 budgets applied', `${items.length} budgets set for ${formatMonthLong(month)}.`);
      onApplied?.();
      onClose();
    } catch (err) {
      toast.error('Could not apply plan', err.message);
    } finally {
      setApplying(false);
    }
  }

  const needsIncome = error?.code === 'INCOME_REQUIRED';

  return (
    <>
      <form
        className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (Number(incomeInput) > 0) load(Number(incomeInput));
        }}
      >
        <label className="flex-1 space-y-1.5 text-sm font-medium">
          <span>Monthly take-home income {plan && !needsIncome && <span className="font-normal text-muted">(optional override)</span>}</span>
          <input
            type="number"
            min="1"
            inputMode="decimal"
            value={incomeInput}
            onChange={(e) => setIncomeInput(e.target.value)}
            placeholder={plan ? String(plan.monthlyIncome) : 'e.g. 85000'}
            className={cn(inputClass, 'tabular border-border')}
          />
        </label>
        <Button type="submit" variant="secondary" disabled={!(Number(incomeInput) > 0) || loading}>
          Recalculate
        </Button>
      </form>

      {loading && (
        <div className="grid h-48 place-items-center" role="status">
          <Loader2 className="size-6 animate-spin text-accent" aria-hidden="true" />
          <span className="sr-only">Calculating plan…</span>
        </div>
      )}

      {!loading && error && (
        <Alert tone={needsIncome ? 'info' : 'error'}>
          {needsIncome ? 'Enter your monthly take-home income above to build a plan.' : error.message}
        </Alert>
      )}

      {!loading && plan && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Based on <span className="tabular font-semibold text-text">{money(plan.monthlyIncome)}</span> a month (
            {BASIS_TEXT[plan.incomeBasis]}). Category splits follow your spending in the last 3 months.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {BUCKETS.map(({ key, label, text }) => {
              const bucket = plan[key];
              const overTarget = key === 'savings' ? bucket.actual < bucket.target : bucket.actual > bucket.target;
              return (
                <div key={key} className="rounded-xl border border-border p-4">
                  <p className="text-sm font-semibold">
                    {label} · {bucket.share}%
                  </p>
                  <p className="tabular mt-1 text-xl font-bold">{money(bucket.target)}</p>
                  <p className="mt-0.5 text-xs text-muted">{text}</p>
                  <div className="mt-3 space-y-1">
                    <ProgressBar
                      size="sm"
                      label={`${label}: currently ${bucket.actualShare}% of income`}
                      value={(bucket.actualShare / bucket.share) * 100}
                      tone={overTarget ? 'warning' : 'ok'}
                    />
                    <p className={cn('text-xs', overTarget ? 'font-semibold text-warning' : 'text-muted')}>
                      You currently: {bucket.actualShare}% ({money(bucket.actual)})
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {(plan.needs.categories.length > 0 || plan.wants.categories.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {['needs', 'wants'].map((key) => (
                <div key={key}>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{key} budgets</p>
                  <ul className="space-y-1.5 text-sm">
                    {plan[key].categories.map((c) => (
                      <li key={c.category} className="flex justify-between gap-3">
                        <span className="truncate">
                          {c.category}
                          {c.fixed && <span className="ml-1.5 text-xs text-muted">fixed</span>}
                        </span>
                        <span className="tabular font-medium">{money(c.suggestedLimit, { decimals: 0 })}</span>
                      </li>
                    ))}
                    {plan[key].categories.length === 0 && <li className="text-muted">No recent spending to split by.</li>}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">Applying sets an overall budget plus the category budgets above. Existing ones are updated.</p>
            <Button onClick={apply} loading={applying}>
              Apply to {formatMonthLong(month)}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
