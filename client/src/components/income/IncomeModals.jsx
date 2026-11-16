import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { FormField } from '../ui/FormField.jsx';
import { useToast } from '../../context/toast.js';
import { incomeService } from '../../services/financeServices.js';
import { applyServerErrors } from '../../utils/forms.js';
import { capitalize, todayInputValue, toInputDate } from '../../utils/format.js';

import { TYPE_LABELS } from './incomeLabels.js';

const sourceSchema = z.object({
  name: z.string().trim().min(1, 'Give this source a name').max(60),
  type: z.string().min(1),
  expectedAmount: z.coerce.number({ error: 'Enter a number' }).min(0, 'Cannot be negative').max(1_000_000_000),
  frequency: z.string().min(1),
  nextExpectedDate: z.string().optional(),
  notes: z.string().trim().max(300).optional(),
});

function sourceDefaults(source) {
  return {
    name: source?.name ?? '',
    type: source?.type ?? 'salary',
    expectedAmount: source?.expectedAmount ?? '',
    frequency: source?.frequency ?? 'monthly',
    nextExpectedDate: toInputDate(source?.nextExpectedDate),
    notes: source?.notes ?? '',
  };
}

export function IncomeSourceModal({ open, source, meta, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(source);
  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(sourceSchema), defaultValues: sourceDefaults(source) });

  useEffect(() => {
    if (open) reset(sourceDefaults(source));
  }, [open, source, reset]);

  const frequency = useWatch({ control, name: 'frequency' });

  async function onSubmit(values) {
    const payload = {
      ...values,
      nextExpectedDate: values.frequency === 'irregular' || !values.nextExpectedDate ? null : values.nextExpectedDate,
    };
    try {
      if (editing) await incomeService.updateSource(source.id, payload);
      else await incomeService.createSource(payload);
      toast.success(editing ? 'Income source updated' : 'Income source added');
      onSaved?.();
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, Object.keys(payload))) toast.error('Could not save', error.message);
    }
  }

  return (
    <Modal open={open} onClose={isSubmitting ? undefined : onClose} title={editing ? 'Edit income source' : 'Add income source'}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Name" error={errors.name?.message}>
          {(field) => <input {...field} maxLength={60} placeholder="e.g. Acme Corp salary" {...register('name')} />}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Type" error={errors.type?.message}>
            {(field) => (
              <select {...field} {...register('type')}>
                {(meta?.incomeSourceTypes ?? []).map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type] ?? capitalize(type)}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField label="How often" error={errors.frequency?.message}>
            {(field) => (
              <select {...field} {...register('frequency')}>
                {(meta?.incomeFrequencies ?? []).map((f) => (
                  <option key={f} value={f}>
                    {f === 'biweekly' ? 'Every 2 weeks' : capitalize(f)}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Expected amount"
            error={errors.expectedAmount?.message}
            hint={frequency === 'irregular' ? 'Optional for irregular income.' : 'Per payment.'}
          >
            {(field) => (
              <input {...field} type="number" inputMode="decimal" min="0" step="0.01" className={`${field.className} tabular`} {...register('expectedAmount')} />
            )}
          </FormField>
          {frequency !== 'irregular' && (
            <FormField label="Next payment date" error={errors.nextExpectedDate?.message} hint="Optional — used for reminders.">
              {(field) => <input {...field} type="date" {...register('nextExpectedDate')} />}
            </FormField>
          )}
        </div>
        <FormField label="Notes (optional)" error={errors.notes?.message}>
          {(field) => <textarea {...field} rows={2} maxLength={300} className={`${field.className} h-auto py-2.5`} {...register('notes')} />}
        </FormField>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editing ? 'Save changes' : 'Add source'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const receiveSchema = z.object({
  amount: z.coerce.number({ error: 'Enter an amount' }).positive('Amount must be greater than zero').max(1_000_000_000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  paymentMethod: z.string().min(1),
  notes: z.string().trim().max(500).optional(),
});

export function ReceiveIncomeModal({ open, source, meta, onClose, onSaved }) {
  const toast = useToast();
  const defaults = () => ({
    amount: source?.expectedAmount || '',
    date: todayInputValue(),
    paymentMethod: 'Bank Transfer',
    notes: '',
  });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(receiveSchema), defaultValues: defaults() });

  useEffect(() => {
    if (open) reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens for a source
  }, [open, source]);

  async function onSubmit(values) {
    try {
      await incomeService.receive(source.id, values);
      toast.success('Income recorded', `Added to your transactions as ${source.name}.`);
      onSaved?.();
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, ['amount', 'date', 'paymentMethod', 'notes'])) {
        toast.error('Could not record income', error.message);
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      title="Record income received"
      description={source ? `From ${source.name}. This adds an income transaction.` : undefined}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Amount received" error={errors.amount?.message}>
            {(field) => (
              <input {...field} type="number" inputMode="decimal" min="0" step="0.01" className={`${field.className} tabular`} {...register('amount')} />
            )}
          </FormField>
          <FormField label="Date received" error={errors.date?.message}>
            {(field) => <input {...field} type="date" {...register('date')} />}
          </FormField>
        </div>
        <FormField label="Received via" error={errors.paymentMethod?.message}>
          {(field) => (
            <select {...field} {...register('paymentMethod')}>
              {(meta?.paymentMethods ?? []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField label="Notes (optional)" error={errors.notes?.message}>
          {(field) => <input {...field} maxLength={500} {...register('notes')} />}
        </FormField>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Record income
          </Button>
        </div>
      </form>
    </Modal>
  );
}
