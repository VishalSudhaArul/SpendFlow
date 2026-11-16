import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { SegmentedControl } from '../ui/SegmentedControl.jsx';
import { Button } from '../ui/Button.jsx';
import { inputClass } from '../ui/FormField.jsx';
import { cn } from '../../utils/cn.js';

import { EMPTY_FILTERS } from './filters.js';

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'amount_desc', label: 'Highest amount' },
  { value: 'amount_asc', label: 'Lowest amount' },
];

function countAdvanced(filters) {
  return ['category', 'paymentMethod', 'from', 'to', 'minAmount', 'maxAmount'].filter((key) => filters[key]).length;
}

/**
 * Search + type toggle are always visible; the rest folds into "Filters"
 * to keep small screens uncluttered.
 */
export function TransactionFilters({ filters, onChange, meta, lockType = false }) {
  const advancedCount = countAdvanced(filters);
  const [expanded, setExpanded] = useState(advancedCount > 0);
  const set = (key) => (event) => onChange({ ...filters, [key]: event.target.value });

  const categoryOptions = filters.type
    ? (meta?.categories?.[filters.type] ?? [])
    : [...new Set([...(meta?.categories?.expense ?? []), ...(meta?.categories?.income ?? [])])];

  const selectClass = cn(inputClass, 'border-border');

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={filters.search}
            onChange={set('search')}
            placeholder="Search description, notes or category"
            aria-label="Search transactions"
            maxLength={80}
            className={cn(inputClass, 'border-border pl-10')}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!lockType && (
            <SegmentedControl
              label="Filter by type"
              value={filters.type}
              onChange={(type) => onChange({ ...filters, type, category: '' })}
              options={[
                { value: '', label: 'All' },
                { value: 'expense', label: 'Expenses' },
                { value: 'income', label: 'Income' },
              ]}
            />
          )}
          <Button variant="secondary" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters
            {advancedCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] text-white">{advancedCount}</span>
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="grid gap-3 rounded-2xl border border-border bg-surface-2/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5 text-sm font-medium">
            <span>Category</span>
            <select value={filters.category} onChange={set('category')} className={selectClass}>
              <option value="">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            <span>Payment method</span>
            <select value={filters.paymentMethod} onChange={set('paymentMethod')} className={selectClass}>
              <option value="">All methods</option>
              {(meta?.paymentMethods ?? []).map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            <span>From date</span>
            <input type="date" value={filters.from} onChange={set('from')} max={filters.to || undefined} className={selectClass} />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            <span>To date</span>
            <input type="date" value={filters.to} onChange={set('to')} min={filters.from || undefined} className={selectClass} />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            <span>Min amount</span>
            <input type="number" min="0" inputMode="decimal" value={filters.minAmount} onChange={set('minAmount')} className={selectClass} />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            <span>Max amount</span>
            <input type="number" min="0" inputMode="decimal" value={filters.maxAmount} onChange={set('maxAmount')} className={selectClass} />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            <span>Sort by</span>
            <select value={filters.sort} onChange={set('sort')} className={selectClass}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onChange({ ...EMPTY_FILTERS, type: lockType ? filters.type : '', search: filters.search })}
              disabled={advancedCount === 0 && filters.sort === 'date_desc'}
            >
              <X className="size-4" aria-hidden="true" />
              Clear filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
