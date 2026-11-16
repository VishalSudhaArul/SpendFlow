import { cn } from '../../utils/cn.js';

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-surface-2', className)} />;
}
