import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const Card = ({ children, className = '', ...props }) => (
  <div
    className={cn(
      'glass-panel rounded-2xl p-6 transition-all duration-300 relative overflow-hidden',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  icon: Icon,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer';

  const variants = {
    primary:
      'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/20 focus:ring-emerald-500 active:scale-98',
    secondary:
      'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 hover:border-slate-600 focus:ring-slate-500',
    outline:
      'border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 focus:ring-emerald-500',
    ghost:
      'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 focus:ring-slate-600',
    danger:
      'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 focus:ring-rose-500',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : Icon ? (
        <Icon className={cn('shrink-0', size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4')} />
      ) : null}
      {children}
    </button>
  );
};

export const Badge = ({ children, variant = 'neutral', className = '' }) => {
  const variants = {
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className={cn(
          'w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto',
          maxWidth
        )}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
          <h3 className="text-lg font-bold text-slate-100 font-heading">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => (
  <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
    {Icon && (
      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
        <Icon className="w-6 h-6" />
      </div>
    )}
    <h3 className="text-base font-semibold text-slate-200">{title}</h3>
    <p className="text-sm text-slate-400 max-w-sm mx-auto mt-1 mb-6">{description}</p>
    {actionLabel && onAction && (
      <Button variant="primary" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);
