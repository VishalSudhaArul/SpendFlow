import { z } from 'zod';
import { EXPENSE_CATEGORIES, MAX_AMOUNT, PAYMENT_METHODS } from '../constants/finance.js';
import { BILLING_CYCLES } from '../models/Subscription.js';
import { addDaysUtc, parseDateOnly, todayUtc } from '../utils/dates.js';
import { amount, dateOnly } from './common.js';

// A first due date more than ~a month in the past would generate a pile of overdue bills.
const dueDate = dateOnly.refine((value) => parseDateOnly(value) >= addDaysUtc(todayUtc(), -31), 'Choose a date within the last month or in the future');

const subscriptionFields = {
  name: z.string().trim().min(1, 'Name is required').max(60),
  kind: z.enum(['subscription', 'bill']),
  amount: z.coerce.number({ error: 'Enter an amount' }).min(1, 'Amount must be at least 1').max(MAX_AMOUNT),
  variableAmount: z.boolean(),
  category: z.enum(EXPENSE_CATEGORIES),
  paymentMethod: z.enum(PAYMENT_METHODS),
  billingCycle: z.enum(BILLING_CYCLES),
  nextDueDate: dueDate,
  reminderDaysBefore: z.coerce.number().int().min(0).max(14),
  autoPay: z.boolean(),
  notes: z.string().trim().max(300),
};

export const createSubscriptionSchema = z.object({
  ...subscriptionFields,
  kind: subscriptionFields.kind.default('subscription'),
  variableAmount: subscriptionFields.variableAmount.default(false),
  category: subscriptionFields.category.default('Subscriptions'),
  paymentMethod: subscriptionFields.paymentMethod.default('UPI'),
  billingCycle: subscriptionFields.billingCycle.default('monthly'),
  reminderDaysBefore: subscriptionFields.reminderDaysBefore.default(3),
  autoPay: subscriptionFields.autoPay.default(false),
  notes: subscriptionFields.notes.optional().default(''),
});

export const updateSubscriptionSchema = z
  .object({
    ...Object.fromEntries(Object.entries(subscriptionFields).map(([key, schema]) => [key, schema.optional()])),
    status: z.enum(['active', 'paused', 'cancelled']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

export const createBillSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  amount: z.coerce.number({ error: 'Enter an amount' }).min(1).max(MAX_AMOUNT),
  category: z.enum(EXPENSE_CATEGORIES),
  paymentMethod: z.enum(PAYMENT_METHODS).default('UPI'),
  dueDate,
  reminderDaysBefore: z.coerce.number().int().min(0).max(14).default(3),
});

export const payBillSchema = z.object({
  amount: amount.optional(),
  date: dateOnly.optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
});

export const billListQuery = z
  .object({
    from: dateOnly.optional(),
    to: dateOnly.optional(),
    status: z.enum(['upcoming', 'unpaid', 'paid', 'skipped']).optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { path: ['to'], message: '"to" must be after "from"' })
  .refine(
    (q) => !q.from || !q.to || (parseDateOnly(q.to) - parseDateOnly(q.from)) / 86_400_000 <= 400,
    { path: ['to'], message: 'Ranges are limited to about a year' },
  );

export const notificationQuery = z.object({
  unreadOnly: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
