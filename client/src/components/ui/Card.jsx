import { cn } from '../../utils/cn.js';

export function Card({ className, children, as: Tag = 'section', ...props }) {
  return (
    <Tag className={cn('rounded-2xl border border-border bg-surface p-5 shadow-card', className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
