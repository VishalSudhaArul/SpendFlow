import { Trash2 } from 'lucide-react';
import { inputClass } from '../ui/FormField.jsx';
import { cn } from '../../utils/cn.js';

import { SCENARIO_TYPES } from './scenarios.js';

const field = cn(inputClass, 'h-10 border-border');

function NumberInput({ label, value, onChange, suffix, min, max, step = 1, id }) {
  return (
    <label htmlFor={id} className="block space-y-1 text-xs font-medium text-muted">
      <span>{label}</span>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value ?? ''}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          className={cn(field, 'tabular text-text', suffix && 'pr-12')}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs text-muted">{suffix}</span>}
      </div>
    </label>
  );
}

/** One editable change in the scenario list. */
export function ScenarioEditor({ scenario, index, categories, currencySymbol, onChange, onRemove }) {
  const { label, icon: Icon } = SCENARIO_TYPES[scenario.type];
  const set = (patch) => onChange({ ...scenario, ...patch });
  const id = (name) => `s${index}-${name}`;

  return (
    <li className="rounded-xl border border-border bg-surface-2/40 p-3.5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-accent-ink" aria-hidden="true" />
        <p className="flex-1 text-sm font-semibold">{label}</p>
        <button type="button" onClick={onRemove} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger" aria-label={`Remove: ${label}`}>
          <Trash2 className="size-4" />
        </button>
      </div>

      {scenario.type === 'category_change' && (
        <div className="grid grid-cols-[1fr_7rem] gap-2">
          <label htmlFor={id('category')} className="block space-y-1 text-xs font-medium text-muted">
            <span>Category</span>
            <select id={id('category')} value={scenario.category} onChange={(e) => set({ category: e.target.value })} className={cn(field, 'text-text')}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <NumberInput id={id('percent')} label="Change" value={scenario.percent} onChange={(percent) => set({ percent })} suffix="%" min={-100} max={300} />
        </div>
      )}

      {scenario.type === 'income_change' && (
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            id={id('percent')}
            label="By percent"
            value={scenario.percent}
            onChange={(percent) => set({ percent, amount: undefined })}
            suffix="%"
            min={-100}
            max={300}
          />
          <NumberInput
            id={id('amount')}
            label="Or by amount / month"
            value={scenario.amount}
            onChange={(amount) => set({ amount, percent: undefined })}
            suffix={currencySymbol}
          />
        </div>
      )}

      {(scenario.type === 'recurring_saving' || scenario.type === 'recurring_expense') && (
        <div className="grid grid-cols-2 gap-2">
          {scenario.type === 'recurring_expense' && (
            <label htmlFor={id('label')} className="block space-y-1 text-xs font-medium text-muted">
              <span>What for</span>
              <input id={id('label')} value={scenario.label ?? ''} maxLength={60} onChange={(e) => set({ label: e.target.value })} className={cn(field, 'text-text')} />
            </label>
          )}
          <NumberInput id={id('amount')} label="Amount / month" value={scenario.amount} onChange={(amount) => set({ amount })} suffix={currencySymbol} min={1} />
        </div>
      )}

      {scenario.type === 'one_time_purchase' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label htmlFor={id('label')} className="block space-y-1 text-xs font-medium text-muted">
              <span>What</span>
              <input id={id('label')} value={scenario.label ?? ''} maxLength={60} onChange={(e) => set({ label: e.target.value })} className={cn(field, 'text-text')} />
            </label>
            <NumberInput id={id('amount')} label="Price" value={scenario.amount} onChange={(amount) => set({ amount })} suffix={currencySymbol} min={1} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <NumberInput id={id('month')} label="In month #" value={scenario.month} onChange={(month) => set({ month })} min={1} max={24} />
            <NumberInput
              id={id('emi')}
              label="EMI months"
              value={scenario.emiMonths}
              onChange={(emiMonths) => set({ emiMonths: emiMonths && emiMonths > 1 ? emiMonths : undefined })}
              min={0}
              max={60}
            />
            <NumberInput
              id={id('rate')}
              label="Interest p.a."
              value={scenario.annualInterestRate}
              onChange={(annualInterestRate) => set({ annualInterestRate })}
              suffix="%"
              min={0}
              max={48}
              step={0.1}
            />
          </div>
          <p className="text-xs text-muted">Leave EMI months empty to pay in full. Month 1 is next month.</p>
        </div>
      )}
    </li>
  );
}
