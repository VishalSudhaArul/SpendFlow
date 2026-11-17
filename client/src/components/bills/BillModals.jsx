import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { FormField } from '../ui/FormField.jsx';
import { useToast } from '../../context/toast.js';
import { useMoney } from '../../hooks/useMoney.js';
import { billService, subscriptionService } from '../../services/financeServices.js';
import { applyServerErrors } from '../../utils/forms.js';
import { formatDate, todayInputValue, toInputDate } from '../../utils/format.js';
import { CYCLE_LABEL } from './billVisuals.js';

const money = z.coerce.number({ error: 'Enter an amount' }).min(1, 'Must be at least 1').max(1_000_000_000);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date');

function Actions({ onClose, submitting, label }) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
      <Button variant="secondary" onClick={onClose} disabled={submitting}>
        Cancel
      </Button>
      <Button type="submit" loading={submitting}>
        {label}
      </Button>
    </div>
  );
}

// ---------- Pay ----------

const paySchema = z.object({ amount: money, date, paymentMethod: z.string().min(1) });

export function PayBillModal({ bill, meta, onClose, onDone }) {
  const fmt = useMoney();
  return (
    <Modal open={Boolean(bill)} onClose={onClose} title={bill ? `Pay ${bill.name}` : ''} description={bill ? `Due ${formatDate(bill.dueDate)}${bill.estimated ? ' · amount is an estimate' : ''}` : undefined}>
      {bill && <PayForm bill={bill} meta={meta} onClose={onClose} onDone={onDone} fmt={fmt} />}
    </Modal>
  );
}

function PayForm({ bill, meta, onClose, onDone, fmt }) {
  const toast = useToast();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(paySchema),
    defaultValues: { amount: bill.amount, date: todayInputValue(), paymentMethod: bill.paymentMethod },
  });

  async function onSubmit(values) {
    try {
      await billService.pay(bill.id, values);
      toast.success(`${bill.name} paid`, `${fmt(values.amount)} added to your expenses.`);
      onDone?.();
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, ['amount', 'date', 'paymentMethod'])) toast.error('Could not record payment', error.message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Amount paid" error={errors.amount?.message} hint={bill.estimated ? 'Enter the actual bill amount' : undefined}>
          {(field) => <input {...field} type="number" inputMode="decimal" step="0.01" min="0" className={`${field.className} tabular`} {...register('amount')} />}
        </FormField>
        <FormField label="Paid on" error={errors.date?.message}>
          {(field) => <input {...field} type="date" max={todayInputValue()} {...register('date')} />}
        </FormField>
      </div>
      <FormField label="Paid with" error={errors.paymentMethod?.message}>
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
      <p className="text-xs text-muted">This records an expense in your transactions. You can undo it from the bill.</p>
      <Actions onClose={onClose} submitting={isSubmitting} label="Mark as paid" />
    </form>
  );
}

// ---------- Subscription create/edit ----------

const subscriptionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  kind: z.enum(['subscription', 'bill']),
  amount: money,
  variableAmount: z.boolean(),
  category: z.string().min(1),
  paymentMethod: z.string().min(1),
  billingCycle: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  nextDueDate: date,
  reminderDaysBefore: z.coerce.number().int().min(0).max(14),
  autoPay: z.boolean(),
  notes: z.string().trim().max(300).optional(),
});

const FIELDS = Object.keys(subscriptionSchema.shape);

export function SubscriptionModal({ open, subscription, meta, onClose, onSaved }) {
  return (
    <Modal open={open} onClose={onClose} title={subscription ? `Edit ${subscription.name}` : 'Add a recurring payment'} size="lg">
      <SubscriptionForm subscription={subscription} meta={meta} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

function SubscriptionForm({ subscription, meta, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(subscription);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      name: subscription?.name ?? '',
      kind: subscription?.kind ?? 'subscription',
      amount: subscription?.amount ?? '',
      variableAmount: subscription?.variableAmount ?? false,
      category: subscription?.category ?? 'Subscriptions',
      paymentMethod: subscription?.paymentMethod ?? 'UPI',
      billingCycle: subscription?.billingCycle ?? 'monthly',
      nextDueDate: toInputDate(subscription?.nextDueDate) || todayInputValue(),
      reminderDaysBefore: subscription?.reminderDaysBefore ?? 3,
      autoPay: subscription?.autoPay ?? false,
      notes: subscription?.notes ?? '',
    },
  });

  async function onSubmit(values) {
    try {
      if (editing) await subscriptionService.update(subscription.id, values);
      else await subscriptionService.create(values);
      toast.success(editing ? 'Saved' : `${values.name} added`, editing ? undefined : 'Upcoming bills were added to your calendar.');
      onSaved?.();
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, FIELDS)) toast.error('Could not save', error.message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <FormField label="Name" error={errors.name?.message}>
          {(field) => <input {...field} maxLength={60} placeholder="e.g. Netflix, Rent, Electricity" {...register('name')} />}
        </FormField>
        <FormField label="Type" error={errors.kind?.message}>
          {(field) => (
            <select {...field} {...register('kind')}>
              <option value="subscription">Subscription</option>
              <option value="bill">Recurring bill</option>
            </select>
          )}
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Amount" error={errors.amount?.message}>
          {(field) => <input {...field} type="number" inputMode="decimal" min="1" step="0.01" className={`${field.className} tabular`} {...register('amount')} />}
        </FormField>
        <FormField label="Billing cycle" error={errors.billingCycle?.message}>
          {(field) => (
            <select {...field} {...register('billingCycle')}>
              {Object.entries(CYCLE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField label={editing ? 'Next due date' : 'First due date'} error={errors.nextDueDate?.message}>
          {(field) => <input {...field} type="date" {...register('nextDueDate')} />}
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Category" error={errors.category?.message}>
          {(field) => (
            <select {...field} {...register('category')}>
              {(meta?.categories?.expense ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField label="Paid with" error={errors.paymentMethod?.message}>
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
        <FormField label="Remind me" error={errors.reminderDaysBefore?.message}>
          {(field) => (
            <select {...field} {...register('reminderDaysBefore')}>
              {[0, 1, 2, 3, 5, 7, 10, 14].map((d) => (
                <option key={d} value={d}>
                  {d === 0 ? 'On the due date' : `${d} day${d === 1 ? '' : 's'} before`}
                </option>
              ))}
            </select>
          )}
        </FormField>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" {...register('variableAmount')} />
          Amount changes each time (e.g. electricity)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" {...register('autoPay')} />
          Paid automatically (auto-debit)
        </label>
      </div>
      <Actions onClose={onClose} submitting={isSubmitting} label={editing ? 'Save changes' : 'Add'} />
    </form>
  );
}

// ---------- One-off bill ----------

const oneOffSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  amount: money,
  category: z.string().min(1),
  paymentMethod: z.string().min(1),
  dueDate: date,
  reminderDaysBefore: z.coerce.number().int().min(0).max(14),
});

export function OneOffBillModal({ open, meta, onClose, onSaved }) {
  return (
    <Modal open={open} onClose={onClose} title="Add a one-time bill" description="For bills that don't repeat on a schedule, like an insurance renewal.">
      <OneOffForm meta={meta} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

function OneOffForm({ meta, onClose, onSaved }) {
  const toast = useToast();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(oneOffSchema),
    defaultValues: { name: '', amount: '', category: 'Bills & Utilities', paymentMethod: 'UPI', dueDate: todayInputValue(), reminderDaysBefore: 3 },
  });

  async function onSubmit(values) {
    try {
      await billService.create(values);
      toast.success(`${values.name} added`);
      onSaved?.();
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, Object.keys(oneOffSchema.shape))) toast.error('Could not add bill', error.message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormField label="Name" error={errors.name?.message}>
        {(field) => <input {...field} maxLength={60} placeholder="e.g. Car insurance renewal" {...register('name')} />}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Amount" error={errors.amount?.message}>
          {(field) => <input {...field} type="number" inputMode="decimal" min="1" step="0.01" className={`${field.className} tabular`} {...register('amount')} />}
        </FormField>
        <FormField label="Due date" error={errors.dueDate?.message}>
          {(field) => <input {...field} type="date" {...register('dueDate')} />}
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Category" error={errors.category?.message}>
          {(field) => (
            <select {...field} {...register('category')}>
              {(meta?.categories?.expense ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField label="Paid with" error={errors.paymentMethod?.message}>
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
      </div>
      <input type="hidden" {...register('reminderDaysBefore')} />
      <Actions onClose={onClose} submitting={isSubmitting} label="Add bill" />
    </form>
  );
}
