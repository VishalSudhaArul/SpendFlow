import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, FlaskConical, Info, Loader2, Sparkles, Target } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { Alert } from '../components/ui/Alert.jsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.jsx';
import { inputClass } from '../components/ui/FormField.jsx';
import { ScenarioEditor } from '../components/simulator/ScenarioEditor.jsx';
import { SCENARIO_TYPES, newScenario } from '../components/simulator/scenarios.js';
import { ProjectionChart } from '../components/simulator/ProjectionChart.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useMoney } from '../hooks/useMoney.js';
import { useMeta } from '../hooks/useMeta.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { simulatorService } from '../services/financeServices.js';
import { formatMonthKey } from '../utils/format.js';
import { cn } from '../utils/cn.js';

const PRESETS = [
  { label: 'Cut food spending 15%', scenario: { type: 'category_change', category: 'Food & Dining', percent: -15 } },
  { label: 'Save ₹2,000 a month', scenario: { type: 'recurring_saving', amount: 2000 } },
  { label: 'Get a 10% raise', scenario: { type: 'income_change', percent: 10 } },
  { label: 'Buy a ₹60,000 laptop', scenario: { type: 'one_time_purchase', amount: 60000, label: 'Laptop', month: 1 } },
];

const STATUS_TONE = { ok: 'success', tight: 'warning', over: 'danger' };
const STATUS_LABEL = { ok: 'Within', tight: 'Tight', over: 'Over' };

let nextKey = 1;
const withKey = (scenario) => ({ ...scenario, key: nextKey++ });

export default function Simulator() {
  const money = useMoney();
  const { data: meta } = useMeta();
  const baseline = useAsync(() => simulatorService.baseline(), []);
  const [scenarios, setScenarios] = useState([]);
  const [months, setMonths] = useState(12);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const categories = meta?.categories?.expense ?? [];
  const currencySymbol = money(0).replace(/[\d.,\s]/g, '') || '₹';

  // Re-run automatically (debounced) whenever the scenario list or horizon changes.
  const payload = useMemo(() => scenarios.map(({ key: _key, ...s }) => s), [scenarios]);
  const debounced = useDebouncedValue(JSON.stringify({ payload, months }), 450);

  useEffect(() => {
    const { payload: list, months: horizon } = JSON.parse(debounced);
    if (list.length === 0) return;
    const id = ++requestId.current;
    // The request is async; state is only updated from its callbacks.
    Promise.resolve()
      .then(() => {
        if (id === requestId.current) setRunning(true);
        return simulatorService.run(list, horizon);
      })
      .then((data) => {
        if (id !== requestId.current) return;
        setResult(data);
        setError(null);
      })
      .catch((err) => {
        if (id === requestId.current) setError(err);
      })
      .finally(() => {
        if (id === requestId.current) setRunning(false);
      });
  }, [debounced]);

  function addScenario(scenario) {
    setScenarios((list) => [...list, withKey(scenario)].slice(-8));
  }

  const showResults = scenarios.length > 0 && result;

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-muted">
        Try a decision before you make it. SpendFlow projects your typical month forward with the changes you add — every number is
        calculated on the server from your own history.
      </p>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr] [&>*]:min-w-0">
        {/* Builder */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Your typical month" description="Starting point for every simulation" />
            {baseline.error ? (
              <ErrorState error={baseline.error} onRetry={baseline.reload} />
            ) : !baseline.data ? (
              <Skeleton className="h-24" />
            ) : baseline.data.income === 0 && baseline.data.categories.length === 0 ? (
              <p className="text-sm text-muted">Record at least a month of income and spending to simulate realistically.</p>
            ) : (
              <BaselineSummary data={baseline.data} money={money} />
            )}
          </Card>

          <Card>
            <CardHeader title="Changes to try" description="Combine up to 8" />
            <div className="mb-4 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => addScenario(preset.scenario)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-accent hover:bg-accent-soft"
                >
                  + {preset.label}
                </button>
              ))}
            </div>

            {scenarios.length > 0 && (
              <ul className="mb-4 space-y-3">
                {scenarios.map((scenario, index) => (
                  <ScenarioEditor
                    key={scenario.key}
                    index={index}
                    scenario={scenario}
                    categories={categories}
                    currencySymbol={currencySymbol}
                    onChange={(next) => setScenarios((list) => list.map((s) => (s.key === scenario.key ? { ...next, key: s.key } : s)))}
                    onRemove={() => setScenarios((list) => list.filter((s) => s.key !== scenario.key))}
                  />
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1 space-y-1 text-xs font-medium text-muted">
                <span>Add a custom change</span>
                <select
                  value=""
                  onChange={(e) => e.target.value && addScenario(newScenario(e.target.value, baseline.data?.categories))}
                  className={cn(inputClass, 'h-10 border-border text-text')}
                  disabled={scenarios.length >= 8}
                >
                  <option value="">Choose…</option>
                  {Object.entries(SCENARIO_TYPES).map(([type, { label }]) => (
                    <option key={type} value={type}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {scenarios.length > 0 && (
                <Button variant="ghost" onClick={() => { setScenarios([]); setResult(null); }}>
                  Clear all
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl
              label="Projection length"
              size="sm"
              value={String(months)}
              onChange={(value) => setMonths(Number(value))}
              options={[
                { value: '6', label: '6 months' },
                { value: '12', label: '12 months' },
                { value: '24', label: '24 months' },
              ]}
            />
            {running && (
              <span className="flex items-center gap-1.5 text-xs text-muted" role="status">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Recalculating…
              </span>
            )}
          </div>

          {error && <Alert>{error.details?.[0]?.message ?? error.message}</Alert>}

          {scenarios.length === 0 ? (
            <Card>
              <EmptyState
                icon={FlaskConical}
                title="Add a change to see its impact"
                description="Start with one of the examples, or build your own. You can combine several — like a raise and a new laptop."
              />
            </Card>
          ) : !showResults ? (
            <div className="space-y-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-64" />
            </div>
          ) : (
            <div className={cn('space-y-6 transition-opacity', running && 'opacity-60')}>
              {!result.hasEnoughData && (
                <Alert tone="info">There is little history yet, so this projection is rough. It improves as you record more months.</Alert>
              )}
              <ResultTiles result={result} money={money} />

              {result.insights.length > 0 && (
                <Card>
                  <CardHeader
                    title={
                      <span className="flex items-center gap-2">
                        <Sparkles className="size-4 text-accent-ink" aria-hidden="true" /> What this means
                      </span>
                    }
                  />
                  <ul className="space-y-2 text-sm">
                    {result.insights.map((text) => (
                      <li key={text} className={cn('flex gap-2', text.startsWith('⚠') && 'font-medium text-warning')}>
                        {text.startsWith('⚠') ? (
                          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        ) : (
                          <ArrowRight className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden="true" />
                        )}
                        <span>{text.replace(/^⚠\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <Card>
                <CardHeader title="Projected balance" description={`From ${formatMonthKey(result.assumptions.startsFrom)}, starting at ${money(result.assumptions.startBalance, { decimals: 0 })}`} />
                <ProjectionChart projection={result.projection} />
              </Card>

              <div className="grid gap-6 2xl:grid-cols-2 [&>*]:min-w-0">
                <CategoryComparison result={result} money={money} />
                <div className="space-y-6">
                  {result.budgetImpact.length > 0 && <BudgetImpact items={result.budgetImpact} money={money} />}
                  {result.goals.requiredMonthly > 0 && <GoalImpact goals={result.goals} money={money} />}
                </div>
              </div>

              <p className="flex gap-2 text-xs text-muted">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Typical month = median spending per category over {result.assumptions.basedOnMonths.map(formatMonthKey).join(', ')}; income ={' '}
                {result.assumptions.incomeBasis === 'income_sources' ? 'expected income from your sources' : 'your recent average'}. Projections
                are estimates, not guarantees.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BaselineSummary({ data, money }) {
  const expense = data.categories.reduce((s, c) => s + c.amount, 0);
  return (
    <div className="space-y-3 text-sm">
      <dl className="grid grid-cols-3 gap-3">
        <div>
          <dt className="text-xs text-muted">Income</dt>
          <dd className="tabular font-semibold">{money(data.income, { decimals: 0 })}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Spending</dt>
          <dd className="tabular font-semibold">{money(expense, { decimals: 0 })}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Surplus</dt>
          <dd className={cn('tabular font-semibold', data.income - expense < 0 ? 'text-danger' : 'text-success')}>{money(data.income - expense, { decimals: 0 })}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted">
        Biggest: {data.categories.slice(0, 3).map((c) => `${c.category} ${money(c.amount, { decimals: 0 })}`).join(' · ')}
      </p>
    </div>
  );
}

function ResultTiles({ result, money }) {
  const { baseline, simulated, summary } = result;
  const tiles = [
    { label: 'Monthly surplus', before: baseline.net, after: simulated.net, format: (v) => money(v, { decimals: 0 }) },
    { label: 'Savings rate', before: baseline.savingsRate, after: simulated.savingsRate, format: (v) => (v === null ? '—' : `${v}%`) },
    { label: `Balance after ${summary.months} months`, before: summary.baselineEndBalance, after: summary.simulatedEndBalance, format: (v) => money(v, { decimals: 0 }) },
    { label: 'Lowest balance', before: null, after: summary.lowestBalance.amount, format: (v) => money(v, { decimals: 0 }), warn: summary.goesNegative || summary.dipsBelowEmergencyFloor },
  ];
  return (
    <section aria-label="Simulation results" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => {
        const delta = t.before === null || t.after === null ? null : t.after - t.before;
        return (
          <Card key={t.label} className={cn('p-4', t.warn && 'border-warning/40')}>
            <p className="text-xs font-medium text-muted">{t.label}</p>
            <p className={cn('tabular mt-1 truncate text-xl font-bold', t.warn && 'text-warning')}>{t.format(t.after)}</p>
            <p className="mt-0.5 text-xs text-muted">
              {t.before === null ? (t.warn ? 'Below one month of expenses' : 'Across the projection') : <>was {t.format(t.before)}</>}
              {delta !== null && delta !== 0 && (
                <span className={cn('ml-1 font-semibold', delta > 0 ? 'text-success' : 'text-danger')}>
                  ({delta > 0 ? '+' : '−'}
                  {t.label === 'Savings rate' ? `${Math.abs(Math.round(delta * 10) / 10)} pts` : money(Math.abs(delta), { decimals: 0 })})
                </span>
              )}
            </p>
          </Card>
        );
      })}
    </section>
  );
}

function CategoryComparison({ result, money }) {
  const rows = [...result.categories];
  for (const extra of result.simulated.extraRecurring) rows.push({ category: extra.label, baseline: 0, simulated: extra.amount, change: extra.amount });
  return (
    <Card>
      <CardHeader title="Typical month, before and after" description="Recurring changes only (one-time purchases excluded)" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Monthly spending by category before and after the changes</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs tracking-wide text-muted uppercase">
              <th scope="col" className="py-2 pr-3 font-semibold">Category</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">Now</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">After</th>
              <th scope="col" className="py-2 pl-2 text-right font-semibold">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr className="font-medium">
              <th scope="row" className="py-2 pr-3 text-left">Income</th>
              <td className="tabular px-2 py-2 text-right">{money(result.baseline.income, { decimals: 0 })}</td>
              <td className="tabular px-2 py-2 text-right">{money(result.simulated.income, { decimals: 0 })}</td>
              <ChangeCell value={result.simulated.income - result.baseline.income} money={money} goodWhenUp />
            </tr>
            {rows.map((row) => (
              <tr key={row.category}>
                <th scope="row" className="py-2 pr-3 text-left font-normal">{row.category}</th>
                <td className="tabular px-2 py-2 text-right text-muted">{money(row.baseline, { decimals: 0 })}</td>
                <td className="tabular px-2 py-2 text-right">{money(row.simulated, { decimals: 0 })}</td>
                <ChangeCell value={row.change} money={money} />
              </tr>
            ))}
            <tr className="font-semibold">
              <th scope="row" className="py-2 pr-3 text-left">Monthly surplus</th>
              <td className="tabular px-2 py-2 text-right">{money(result.baseline.net, { decimals: 0 })}</td>
              <td className="tabular px-2 py-2 text-right">{money(result.simulated.net, { decimals: 0 })}</td>
              <ChangeCell value={result.simulated.net - result.baseline.net} money={money} goodWhenUp />
            </tr>
            {result.simulated.plannedSavings > 0 && (
              <tr>
                <th scope="row" className="py-2 pr-3 text-left font-normal text-muted">…of which set aside</th>
                <td />
                <td className="tabular px-2 py-2 text-right">{money(result.simulated.plannedSavings, { decimals: 0 })}</td>
                <td className="tabular py-2 pl-2 text-right text-xs text-muted">{money(result.simulated.unallocated, { decimals: 0 })} free</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {result.purchases.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
          {result.purchases.map((p) => (
            <li key={`${p.label}-${p.startMonthIndex}`} className="flex flex-wrap justify-between gap-2">
              <span>
                {p.label} · {formatMonthKey(result.projection[p.startMonthIndex].month)}
              </span>
              <span className="tabular text-muted">
                {p.emiMonths ? `${p.emiMonths} × ${money(p.installment, { decimals: 0 })} = ${money(p.totalPaid, { decimals: 0 })}` : money(p.amount, { decimals: 0 })}
                {p.interest > 0 && <span className="text-danger"> (+{money(p.interest, { decimals: 0 })} interest)</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ChangeCell({ value, money, goodWhenUp = false }) {
  if (!value) return <td className="py-2 pl-2 text-right text-muted">—</td>;
  const good = goodWhenUp ? value > 0 : value < 0;
  return (
    <td className={cn('tabular py-2 pl-2 text-right font-medium', good ? 'text-success' : 'text-danger')}>
      {value > 0 ? '+' : '−'}
      {money(Math.abs(value), { decimals: 0 })}
    </td>
  );
}

function BudgetImpact({ items, money }) {
  return (
    <Card>
      <CardHeader title="Against this month's budgets" description="A typical simulated month vs your limits" />
      <ul className="space-y-2.5 text-sm">
        {items.map((b) => (
          <li key={b.category} className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{b.category}</span>
            <span className="flex items-center gap-2">
              <span className="tabular text-xs text-muted">
                {money(b.simulated, { decimals: 0 })} / {money(b.limit, { decimals: 0 })}
              </span>
              {b.baselineStatus !== b.simulatedStatus && <Badge tone={STATUS_TONE[b.baselineStatus]}>{STATUS_LABEL[b.baselineStatus]}</Badge>}
              {b.baselineStatus !== b.simulatedStatus && <ArrowRight className="size-3.5 text-muted" aria-label="becomes" />}
              <Badge tone={STATUS_TONE[b.simulatedStatus]}>{STATUS_LABEL[b.simulatedStatus]}</Badge>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function GoalImpact({ goals, money }) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Target className="size-4 text-accent-ink" aria-hidden="true" /> Savings goals
          </span>
        }
        description={`Your active goals need ${money(goals.requiredMonthly, { decimals: 0 })} a month`}
      />
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted">Surplus covers now</dt>
          <dd className="tabular text-lg font-semibold">{goals.baselineCoverage}%</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">With changes</dt>
          <dd className={cn('tabular text-lg font-semibold', goals.simulatedCoverage < 100 ? 'text-warning' : 'text-success')}>{goals.simulatedCoverage}%</dd>
        </div>
      </dl>
    </Card>
  );
}

