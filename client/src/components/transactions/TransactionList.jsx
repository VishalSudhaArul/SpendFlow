import { createElement } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { categoryIcon } from './categoryStyles.js';
import { useMoney } from '../../hooks/useMoney.js';
import { formatDate, formatShortDate } from '../../utils/format.js';
import { Skeleton } from '../ui/Skeleton.jsx';
import { cn } from '../../utils/cn.js';

function Amount({ transaction }) {
  const money = useMoney();
  const income = transaction.type === 'income';
  return (
    <span className={cn('tabular font-semibold whitespace-nowrap', income ? 'text-success' : 'text-text')}>
      {income ? '+' : '−'}
      {money(transaction.amount)}
    </span>
  );
}

function CategoryBadge({ transaction }) {
  return (
    <span
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-xl',
        transaction.type === 'income' ? 'bg-success/12 text-success' : 'bg-accent-soft text-accent',
      )}
    >
      {createElement(categoryIcon(transaction.category, transaction.type), {
        className: 'size-[18px]',
        'aria-hidden': true,
      })}
    </span>
  );
}

function RowActions({ transaction, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(transaction)}
        className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text"
        aria-label={`Edit ${transaction.description}`}
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(transaction)}
        className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
        aria-label={`Delete ${transaction.description}`}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

export function TransactionListSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Table on wide screens, stacked cards on phones. */
export function TransactionList({ items, onEdit, onDelete }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Transactions</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs tracking-wide text-muted uppercase">
              <th scope="col" className="py-3 pr-3 font-semibold">Transaction</th>
              <th scope="col" className="px-3 py-3 font-semibold">Category</th>
              <th scope="col" className="px-3 py-3 font-semibold">Method</th>
              <th scope="col" className="px-3 py-3 font-semibold">Date</th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">Amount</th>
              <th scope="col" className="py-3 pl-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((t) => (
              <tr key={t.id} className="group hover:bg-surface-2/50">
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-3">
                    <CategoryBadge transaction={t} />
                    <div className="min-w-0">
                      <p className="max-w-64 truncate font-medium">{t.description}</p>
                      {t.notes && <p className="max-w-64 truncate text-xs text-muted">{t.notes}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-muted">{t.category}</td>
                <td className="px-3 py-3 whitespace-nowrap text-muted">{t.paymentMethod}</td>
                <td className="px-3 py-3 whitespace-nowrap text-muted">{formatDate(t.date)}</td>
                <td className="px-3 py-3 text-right">
                  <Amount transaction={t} />
                </td>
                <td className="py-3 pl-3">
                  <RowActions transaction={t} onEdit={onEdit} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {items.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <CategoryBadge transaction={t} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.description}</p>
              <p className="truncate text-xs text-muted">
                {t.category} · {formatShortDate(t.date)} · {t.paymentMethod}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <Amount transaction={t} />
              <RowActions transaction={t} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
