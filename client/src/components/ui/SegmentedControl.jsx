import { cn } from '../../utils/cn.js';

/** Radio-group styled as a segmented toggle. */
export function SegmentedControl({ label, options, value, onChange, className, size = 'md' }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex rounded-xl border border-border bg-surface-2 p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 rounded-lg font-semibold whitespace-nowrap transition',
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
              active ? 'bg-surface text-text shadow-card' : 'text-muted hover:text-text',
              active && option.activeClass,
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
