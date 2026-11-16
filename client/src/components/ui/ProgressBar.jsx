import { cn } from '../../utils/cn.js';

const TONES = {
  ok: 'bg-success',
  warning: 'bg-warning',
  over: 'bg-danger',
  accent: 'brand-gradient',
};

/** Accessible progress bar. `value` is a percentage and may exceed 100 (shown full). */
export function ProgressBar({ value, tone = 'accent', label, className, size = 'md' }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-valuetext={`${Math.round(value)}%`}
      className={cn('w-full overflow-hidden rounded-full bg-surface-2', size === 'sm' ? 'h-1.5' : 'h-2.5', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500', TONES[tone])} style={{ width: `${clamped}%` }} />
    </div>
  );
}
