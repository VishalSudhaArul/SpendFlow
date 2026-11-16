import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Download, Plus, Receipt, Scale } from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { TransactionFilters } from '../components/transactions/TransactionFilters.jsx';
import { EMPTY_FILTERS } from '../components/transactions/filters.js';
import { TransactionList, TransactionListSkeleton } from '../components/transactions/TransactionList.jsx';
import { TransactionFormModal } from '../components/transactions/TransactionFormModal.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useMeta } from '../hooks/useMeta.js';
import { useMoney } from '../hooks/useMoney.js';
import { useToast } from '../context/toast.js';
import { transactionService } from '../services/financeServices.js';
import { cn } from '../utils/cn.js';

const PAGE_SIZE = 15;

export default function Transactions() {
  const toast = useToast();
  const money = useMoney();
  const { data: meta } = useMeta();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [formState, setFormState] = useState({ open: false, transaction: null });
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Typing in search shouldn't fire a request per keystroke.
  const debouncedFilters = useDebouncedValue(filters, 300);
  const query = useMemo(() => ({ ...debouncedFilters, page, limit: PAGE_SIZE }), [debouncedFilters, page]);

  const { data, error, loading, reload } = useAsync(
    () => transactionService.list(query),
    [query, reloadKey],
  );

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => key !== 'sort' && value !== '');

  function updateFilters(next) {
    setFilters(next);
    setPage(1);
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await transactionService.remove(toDelete.id);
      toast.success('Transaction deleted');
      setToDelete(null);
      // Step back a page if we just removed the last row on it.
      if (data?.items.length === 1 && page > 1) setPage(page - 1);
      else setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error('Could not delete transaction', err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await transactionService.exportCsv(debouncedFilters);
      toast.success('Export ready', 'Your CSV file has been downloaded.');
    } catch (err) {
      toast.error('Export failed', err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Every rupee in and out, searchable and filterable.</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport} loading={exporting} disabled={!data?.meta?.total}>
            {!exporting && <Download className="size-4" aria-hidden="true" />}
            Export CSV
          </Button>
          <Button onClick={() => setFormState({ open: true, transaction: null })} className="flex-1 sm:flex-none">
            <Plus className="size-4" aria-hidden="true" />
            Add transaction
          </Button>
        </div>
      </div>

      <TotalsStrip totals={data?.totals} loading={loading && !data} money={money} filtered={hasActiveFilters} />

      <Card className="p-4 sm:p-5">
        <TransactionFilters filters={filters} onChange={updateFilters} meta={meta} />

        <div className="mt-5">
          {error ? (
            <ErrorState title="Could not load transactions" error={error} onRetry={reload} />
          ) : loading && !data ? (
            <TransactionListSkeleton />
          ) : data.items.length === 0 ? (
            hasActiveFilters ? (
              <EmptyState
                icon={Receipt}
                title="No matching transactions"
                description="Try a different search or clear some filters."
                action={
                  <Button variant="secondary" onClick={() => updateFilters(EMPTY_FILTERS)}>
                    Clear all filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Receipt}
                title="No transactions yet"
                description="Add your first expense or income to start seeing where your money goes."
                action={
                  <Button onClick={() => setFormState({ open: true, transaction: null })}>
                    <Plus className="size-4" aria-hidden="true" />
                    Add transaction
                  </Button>
                }
              />
            )
          ) : (
            <div className={cn('transition-opacity', loading && 'opacity-60')}>
              <TransactionList
                items={data.items}
                onEdit={(transaction) => setFormState({ open: true, transaction })}
                onDelete={setToDelete}
              />
              <div className="mt-5 border-t border-border pt-4">
                <Pagination
                  page={data.meta.page}
                  totalPages={data.meta.totalPages}
                  total={data.meta.total}
                  limit={data.meta.limit}
                  onChange={setPage}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      <TransactionFormModal
        open={formState.open}
        transaction={formState.transaction}
        meta={meta}
        onClose={() => setFormState({ open: false, transaction: null })}
        onSaved={() => setReloadKey((k) => k + 1)}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this transaction?"
        description={
          toDelete ? `"${toDelete.description}" (${money(toDelete.amount)}) will be permanently removed.` : undefined
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function TotalsStrip({ totals, loading, money, filtered }) {
  const items = [
    { label: 'Income', value: totals?.income, icon: ArrowDownLeft, tone: 'text-success bg-success/12' },
    { label: 'Expenses', value: totals?.expense, icon: ArrowUpRight, tone: 'text-danger bg-danger/12' },
    { label: 'Net', value: totals?.net, icon: Scale, tone: 'text-accent bg-accent-soft' },
  ];
  return (
    <section aria-label={filtered ? 'Totals for current filters' : 'All-time totals'} className="grid grid-cols-3 gap-3">
      {items.map(({ label, value, icon: Icon, tone }) => (
        <Card key={label} className="p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <span className={cn('hidden size-8 place-items-center rounded-lg sm:grid', tone)}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <p className="text-xs font-medium text-muted sm:text-sm">
              {label}
              {filtered && <span className="hidden lg:inline"> (filtered)</span>}
            </p>
          </div>
          {loading ? (
            <Skeleton className="mt-2 h-6 w-3/4" />
          ) : (
            <p className="tabular mt-1.5 text-base font-bold sm:text-xl" title={money(value ?? 0)}>
              {/* Phones get compact figures (₹5.6L) so three cards fit side by side without truncation. */}
              <span className="sm:hidden">{money(value ?? 0, { compact: Math.abs(value ?? 0) >= 1000 })}</span>
              <span className="hidden truncate sm:block">{money(value ?? 0, { compact: Math.abs(value ?? 0) >= 10_000_000 })}</span>
            </p>
          )}
        </Card>
      ))}
    </section>
  );
}
