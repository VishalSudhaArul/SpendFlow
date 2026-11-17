import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { FormField } from '../ui/FormField.jsx';
import { SegmentedControl } from '../ui/SegmentedControl.jsx';
import { useToast } from '../../context/toast.js';
import { transactionService } from '../../services/financeServices.js';
import { applyServerErrors } from '../../utils/forms.js';
import { todayInputValue, toInputDate } from '../../utils/format.js';

const schema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z.coerce
    .number({ error: 'Enter an amount' })
    .positive('Amount must be greater than zero')
    .max(1_000_000_000, 'Amount is too large')
    .refine((v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6, 'Use at most 2 decimal places'),
  category: z.string().min(1, 'Choose a category'),
  description: z.string().trim().min(1, 'Add a short description').max(120),
  paymentMethod: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  notes: z.string().trim().max(500).optional(),
});

const FIELDS = ['type', 'amount', 'category', 'description', 'paymentMethod', 'date', 'notes'];

/** What the parser understood and assumed; nothing is saved until the user confirms. */
function DraftNotice({ draft, source }) {
  const low = draft.confidence < 0.7 || draft.missing?.length > 0;
  return (
    <div className={`rounded-xl border px-3.5 py-3 text-sm ${low ? 'border-warning/40 bg-warning/8' : 'border-accent/30 bg-accent-soft'}`}>
      <p className="flex items-center gap-1.5 font-semibold">
        <Sparkles className="size-4 text-accent-ink" aria-hidden="true" />
        {source === 'ai' ? 'Filled in by AI' : 'Filled in from your text'} — please check every field
      </p>
      {(draft.assumptions?.length > 0 || draft.missing?.length > 0) && (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-muted">
          {draft.missing?.includes('amount') && <li className="font-medium text-warning">No amount found — please enter it.</li>}
          {draft.assumptions?.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function initialValues(transaction, defaultType, draft) {
  if (draft) {
    return {
      type: draft.type,
      amount: draft.amount ?? '',
      category: draft.category,
      description: draft.description,
      paymentMethod: draft.paymentMethod,
      date: draft.date,
      notes: '',
    };
  }
  if (transaction) {
    return {
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      description: transaction.description,
      paymentMethod: transaction.paymentMethod,
      date: toInputDate(transaction.date),
      notes: transaction.notes ?? '',
    };
  }
  return {
    type: defaultType,
    amount: '',
    category: '',
    description: '',
    paymentMethod: defaultType === 'income' ? 'Bank Transfer' : 'UPI',
    date: todayInputValue(),
    notes: '',
  };
}

/**
 * Create or edit a transaction. Pass `transaction` to edit, or `draft` (from
 * natural-language parsing) to review an AI-prepared transaction before saving.
 * Calls onSaved(savedTransaction) after a successful save.
 */
export function TransactionFormModal({ open, onClose, transaction, draft, draftSource, defaultType = 'expense', meta, onSaved }) {
  const toast = useToast();
  const editing = Boolean(transaction);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: initialValues(transaction, defaultType, draft) });

  useEffect(() => {
    if (open) reset(initialValues(transaction, defaultType, draft));
  }, [open, transaction, defaultType, draft, reset]);

  const type = useWatch({ control, name: 'type' });
  const categories = meta?.categories?.[type] ?? [];

  function changeType(nextType) {
    setValue('type', nextType);
    // A category from the other type would be invalid.
    setValue('category', '');
    setValue('paymentMethod', nextType === 'income' ? 'Bank Transfer' : 'UPI');
  }

  async function onSubmit(values) {
    try {
      const saved = editing
        ? await transactionService.update(transaction.id, values)
        : await transactionService.create(draft ? { ...values, origin: 'ai' } : values);
      toast.success(editing ? 'Transaction updated' : `${values.type === 'income' ? 'Income' : 'Expense'} added`);
      onSaved?.(saved);
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, FIELDS)) toast.error('Could not save transaction', error.message);
    }
  }

  return (
    <Modal
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      title={editing ? 'Edit transaction' : draft ? 'Check before saving' : 'Add transaction'}
      description={editing ? undefined : draft ? undefined : 'Record money going out or coming in.'}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {draft && <DraftNotice draft={draft} source={draftSource} />}
        <SegmentedControl
          label="Transaction type"
          className="w-full"
          value={type}
          onChange={changeType}
          options={[
            { value: 'expense', label: 'Expense', activeClass: 'text-danger' },
            { value: 'income', label: 'Income', activeClass: 'text-success' },
          ]}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Amount" error={errors.amount?.message}>
            {(field) => (
              <input
                {...field}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                className={`${field.className} tabular`}
                {...register('amount')}
              />
            )}
          </FormField>
          <FormField label="Date" error={errors.date?.message}>
            {(field) => <input {...field} type="date" max="2100-12-31" {...register('date')} />}
          </FormField>
        </div>

        <FormField label="Description" error={errors.description?.message}>
          {(field) => (
            <input
              {...field}
              maxLength={120}
              placeholder={type === 'income' ? 'e.g. November salary' : 'e.g. Dinner at Truffles'}
              {...register('description')}
            />
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Category" error={errors.category?.message}>
            {(field) => (
              <select {...field} {...register('category')}>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField label={type === 'income' ? 'Received via' : 'Paid with'} error={errors.paymentMethod?.message}>
            {(field) => (
              <select {...field} {...register('paymentMethod')}>
                {(meta?.paymentMethods ?? []).map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>

        <FormField label="Notes (optional)" error={errors.notes?.message}>
          {(field) => (
            <textarea {...field} rows={2} maxLength={500} className={`${field.className} h-auto py-2.5`} {...register('notes')} />
          )}
        </FormField>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editing ? 'Save changes' : 'Add transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
