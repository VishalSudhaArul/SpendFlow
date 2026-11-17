import { createElement, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { FormField } from '../ui/FormField.jsx';
import { SegmentedControl } from '../ui/SegmentedControl.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { useToast } from '../../context/toast.js';
import { useMoney } from '../../hooks/useMoney.js';
import { goalService } from '../../services/financeServices.js';
import { applyServerErrors } from '../../utils/forms.js';
import { formatDate, todayInputValue, toInputDate } from '../../utils/format.js';
import { cn } from '../../utils/cn.js';
import { GOAL_ICON_COMPONENTS, GOAL_ICON_LABELS } from './goalVisuals.js';

const goalSchema = z.object({
  name: z.string().trim().min(1, 'Name your goal').max(60),
  targetAmount: z.coerce.number({ error: 'Enter a target' }).min(1, 'Target must be at least 1').max(1_000_000_000),
  deadline: z.string().optional(),
  icon: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  initialAmount: z.coerce.number().min(0, 'Cannot be negative').max(1_000_000_000).optional(),
});

function goalDefaults(goal) {
  return {
    name: goal?.name ?? '',
    targetAmount: goal?.targetAmount ?? '',
    deadline: toInputDate(goal?.deadline),
    icon: goal?.icon ?? 'piggy-bank',
    priority: goal?.priority ?? 'medium',
    initialAmount: '',
  };
}

// Modal renders its children only while open, so each form below mounts fresh
// (with fresh default values) every time its dialog opens.

export function GoalFormModal({ open, goal, onClose, onSaved }) {
  return (
    <Modal open={open} onClose={onClose} title={goal ? 'Edit goal' : 'New savings goal'}>
      <GoalForm goal={goal} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

function GoalForm({ goal, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(goal);
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(goalSchema), defaultValues: goalDefaults(goal) });
  const [icon, setIcon] = useState(() => goalDefaults(goal).icon);

  function chooseIcon(value) {
    setIcon(value);
    setValue('icon', value, { shouldDirty: true });
  }

  async function onSubmit(values) {
    const payload = {
      name: values.name,
      targetAmount: values.targetAmount,
      deadline: values.deadline || null,
      icon: values.icon,
      priority: values.priority,
    };
    if (!editing && values.initialAmount) payload.initialAmount = values.initialAmount;
    try {
      if (editing) await goalService.update(goal.id, payload);
      else await goalService.create(payload);
      toast.success(editing ? 'Goal updated' : `"${values.name}" created`);
      onSaved?.();
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, Object.keys(getValues()))) toast.error('Could not save goal', error.message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Goal name" error={errors.name?.message}>
          {(field) => <input {...field} maxLength={60} placeholder="e.g. Emergency fund" {...register('name')} />}
        </FormField>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Icon</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Goal icon">
            {Object.entries(GOAL_ICON_COMPONENTS).map(([key, Icon]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={icon === key}
                aria-label={GOAL_ICON_LABELS[key]}
                title={GOAL_ICON_LABELS[key]}
                onClick={() => chooseIcon(key)}
                className={cn(
                  'grid size-10 place-items-center rounded-xl border transition',
                  icon === key ? 'border-accent bg-accent-soft text-accent-ink' : 'border-border text-muted hover:text-text',
                )}
              >
                <Icon className="size-[18px]" aria-hidden="true" />
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Target amount" error={errors.targetAmount?.message}>
            {(field) => (
              <input {...field} type="number" inputMode="decimal" min="1" className={`${field.className} tabular`} {...register('targetAmount')} />
            )}
          </FormField>
          <FormField label="Target date (optional)" error={errors.deadline?.message}>
            {(field) => <input {...field} type="date" min={todayInputValue()} {...register('deadline')} />}
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Priority" error={errors.priority?.message}>
            {(field) => (
              <select {...field} {...register('priority')}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            )}
          </FormField>
          {!editing && (
            <FormField label="Already saved (optional)" error={errors.initialAmount?.message}>
              {(field) => (
                <input {...field} type="number" inputMode="decimal" min="0" placeholder="0" className={`${field.className} tabular`} {...register('initialAmount')} />
              )}
            </FormField>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {editing ? 'Save changes' : 'Create goal'}
          </Button>
        </div>
      </form>
  );
}

const contributionSchema = z.object({
  amount: z.coerce.number({ error: 'Enter an amount' }).positive('Amount must be greater than zero').max(1_000_000_000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  note: z.string().trim().max(120).optional(),
});

export function ContributionModal({ open, goal, initialType = 'deposit', onClose, onSaved }) {
  const money = useMoney();
  if (!goal) return null;
  return (
    <Modal open={open} onClose={onClose} title={goal.name} description={`${money(goal.saved)} saved of ${money(goal.targetAmount)}`}>
      <ContributionForm goal={goal} initialType={initialType} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

function ContributionForm({ goal, initialType, onClose, onSaved }) {
  const toast = useToast();
  const money = useMoney();
  const [type, setType] = useState(initialType);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      amount: goal.requiredMonthly && initialType === 'deposit' ? Math.ceil(goal.requiredMonthly) : '',
      date: todayInputValue(),
      note: '',
    },
  });

  async function onSubmit(values) {
    try {
      const result = await goalService.contribute(goal.id, { ...values, type });
      if (result.justCompleted) toast.success(`🎉 "${goal.name}" reached!`, 'You hit your savings target.');
      else toast.success(type === 'deposit' ? `${money(values.amount)} added to ${goal.name}` : `${money(values.amount)} withdrawn`);
      onSaved?.();
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, ['amount', 'date', 'note'])) toast.error('Could not save', error.message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <SegmentedControl
          label="Contribution type"
          className="w-full"
          value={type}
          onChange={setType}
          options={[
            { value: 'deposit', label: 'Add money' },
            { value: 'withdrawal', label: 'Withdraw' },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Amount"
            error={errors.amount?.message}
            hint={type === 'deposit' && goal.requiredMonthly ? `${money(goal.requiredMonthly)}/month keeps you on track` : undefined}
          >
            {(field) => (
              <input {...field} type="number" inputMode="decimal" min="0" step="0.01" className={`${field.className} tabular`} {...register('amount')} />
            )}
          </FormField>
          <FormField label="Date" error={errors.date?.message}>
            {(field) => <input {...field} type="date" max={todayInputValue()} {...register('date')} />}
          </FormField>
        </div>
        <FormField label="Note (optional)" error={errors.note?.message}>
          {(field) => <input {...field} maxLength={120} placeholder="e.g. Diwali bonus" {...register('note')} />}
        </FormField>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} variant={type === 'withdrawal' ? 'danger' : 'primary'}>
            {type === 'deposit' ? 'Add to goal' : 'Withdraw'}
          </Button>
        </div>
      </form>
  );
}

export function GoalHistoryModal({ open, goal, onClose, onChanged }) {
  const toast = useToast();
  const money = useMoney();
  const [removing, setRemoving] = useState(null);

  async function remove(contribution) {
    setRemoving(contribution.id);
    try {
      await goalService.removeContribution(goal.id, contribution.id);
      toast.success('Entry removed');
      onChanged?.();
    } catch (error) {
      toast.error('Could not remove entry', error.message);
    } finally {
      setRemoving(null);
    }
  }

  if (!goal) return null;

  return (
    <Modal open={open} onClose={onClose} title={`${goal.name} history`} description={`${goal.contributions.length} entries`}>
      {goal.contributions.length === 0 ? (
        <EmptyState icon={GOAL_ICON_COMPONENTS[goal.icon]} title="No contributions yet" className="py-6" />
      ) : (
        <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto">
          {goal.contributions.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{formatDate(c.date)}</p>
                {c.note && <p className="truncate text-xs text-muted">{c.note}</p>}
              </div>
              <span className={cn('tabular font-semibold', c.amount < 0 ? 'text-danger' : 'text-success')}>
                {c.amount < 0 ? '−' : '+'}
                {money(Math.abs(c.amount))}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                loading={removing === c.id}
                onClick={() => remove(c)}
                aria-label={`Remove ${money(Math.abs(c.amount))} entry from ${formatDate(c.date)}`}
              >
                {removing !== c.id && createElement(Trash2, { className: 'size-4', 'aria-hidden': true })}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
