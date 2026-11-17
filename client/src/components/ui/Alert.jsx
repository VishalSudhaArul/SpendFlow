import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../../utils/cn.js';

const TONES = {
  error: { icon: AlertTriangle, className: 'border-danger/30 bg-danger/8 text-danger' },
  success: { icon: CheckCircle2, className: 'border-success/30 bg-success/8 text-success' },
  info: { icon: Info, className: 'border-accent/30 bg-accent-soft text-accent-ink' },
};

export function Alert({ tone = 'error', children, className }) {
  const { icon: Icon, className: toneClass } = TONES[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm', toneClass, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 font-medium">{children}</div>
    </div>
  );
}
