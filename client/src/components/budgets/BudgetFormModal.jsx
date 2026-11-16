import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { FormField } from '../ui/FormField.jsx';
import { useToast } from '../../context/toast.js';
import { budgetService } from '../../services/financeServices.js';
import { applyServerErrors } from '../../utils/forms.js';
import { formatMonthLong } from '../../utils/months.js';

const OVERALL = '__overall__';

const schema = z.object({
  category: z.string().min(1, 'Choose what this budget covers'),
  limit: z.coerce.number({ error: 'Enter a limit' }).min(1, 'Limit must be at least 1').max(1_000_000_000),
  alertThreshold: z.coerce.number().int().min(50).max(100),
});

/**
 * Create or edit one budget. `budget` (optional) edits an existing one;
 * `takenCategories` hides categories that already have a budget this month.
 */
export function BudgetFormModal({ open, onClose, month, budget, presetCategory, takenCategories = [], hasOverall, meta, onSaved }) {
  const toast = useToast();
  const editing = Boolean(budget);

  const defaults = () => ({
    category: budget ? (budget.category ?? OVERALL) : (presetCategory ?? ''),
    limit: budget?.limit ?? '',
    alertThreshold: budget?.alertThreshold ?? 80,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: defaults() });

  useEffect(() => {
    if (open) reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when the dialog opens
  }, [open, budget, presetCategory]);

  const available = (meta?.categories?.expense ?? []).filter((c) => !takenCategories.includes(c));

  async function onSubmit(values) {
    try {
      if (editing) {
        await budgetService.update(budget.id, { limit: values.limit, alertThreshold: values.alertThreshold });
      } else {
        await budgetService.save({
          month,
          category: values.category === OVERALL ? null : values.category,
          limit: values.limit,
          alertThreshold: values.alertThreshold,
        });
      }
      toast.success(editing ? 'Budget updated' : 'Budget saved');
      onSaved?.();
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, ['category', 'limit', 'alertThreshold'])) toast.error('Could not save budget', error.message);
    }
  }

  const title = editing ? `Edit ${budget.category ?? 'overall'} budget` : 'Set a budget';

  return (
    <Modal open={open} onClose={isSubmitting ? undefined : onClose} title={title} description={formatMonthLong(month)}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {!editing && (
          <FormField label="Budget for" error={errors.category?.message}>
            {(field) => (
              <select {...field} {...register('category')}>
                <option value="">Choose…</option>
                {!hasOverall && <option value={OVERALL}>All spending (overall monthly budget)</option>}
                {available.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Monthly limit" error={errors.limit?.message}>
            {(field) => (
              <input {...field} type="number" inputMode="decimal" min="1" step="1" className={`${field.className} tabular`} {...register('limit')} />
            )}
          </FormField>
          <FormField label="Warn me at" error={errors.alertThreshold?.message} hint="Percent of the limit">
            {(field) => (
              <select {...field} {...register('alertThreshold')}>
                {[50, 60, 70, 75, 80, 85, 90, 95, 100].map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editing ? 'Save changes' : 'Save budget'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
