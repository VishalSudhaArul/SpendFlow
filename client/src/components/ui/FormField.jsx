import { useId } from 'react';
import { cn } from '../../utils/cn.js';

export const inputClass =
  'h-11 w-full rounded-xl border bg-surface px-3.5 text-sm text-text placeholder:text-muted/70 transition ' +
  'focus:border-accent focus:ring-3 focus:ring-accent-soft focus:outline-none disabled:opacity-60';

/**
 * Label + control + hint/error, wired up with aria attributes.
 * `children` is a render function receiving the props to spread on the control.
 */
export function FormField({ label, error, hint, className, children, action }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {action}
      </div>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        className: cn(inputClass, error ? 'border-danger' : 'border-border'),
      })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
