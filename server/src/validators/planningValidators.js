import { z } from 'zod';
import { EXPENSE_CATEGORIES, MAX_AMOUNT } from '../constants/finance.js';
import { GOAL_ICONS } from '../models/SavingsGoal.js';
import { amount, dateOnly, objectId } from './common.js';

export const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use the format YYYY-MM');
const limit = z.coerce.number({ error: 'Enter a limit' }).min(1, 'Limit must be at least 1').max(MAX_AMOUNT);
const category = z.enum(EXPENSE_CATEGORIES).nullable();

export const monthQuery = z.object({ month: monthKey.optional() });

export const createBudgetSchema = z.object({
  month: monthKey,
  category: category.default(null),
  limit,
  alertThreshold: z.coerce.number().int().min(50).max(100).optional(),
});

export const updateBudgetSchema = z
  .object({
    limit: limit.optional(),
    alertThreshold: z.coerce.number().int().min(50).max(100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

export const bulkBudgetsSchema = z.object({
  month: monthKey,
  items: z
    .array(z.object({ category, limit }))
    .min(1)
    .max(EXPENSE_CATEGORIES.length + 1)
    .refine(
      (items) => new Set(items.map((i) => i.category ?? '__overall__')).size === items.length,
      'Each category can appear only once',
    ),
});

export const copyBudgetsSchema = z.object({ fromMonth: monthKey, toMonth: monthKey });

export const fiftyThirtyTwentyQuery = z.object({
  month: monthKey.optional(),
  income: z.coerce.number().positive().max(MAX_AMOUNT).optional(),
});

const goalFields = {
  name: z.string().trim().min(1, 'Name your goal').max(60),
  targetAmount: z.coerce.number({ error: 'Enter a target amount' }).min(1, 'Target must be at least 1').max(MAX_AMOUNT),
  deadline: dateOnly.nullable().optional(),
  icon: z.enum(GOAL_ICONS).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
};

export const createGoalSchema = z.object({
  ...goalFields,
  initialAmount: z.coerce.number().min(0).max(MAX_AMOUNT).optional(),
});

export const updateGoalSchema = z
  .object({
    name: goalFields.name.optional(),
    targetAmount: goalFields.targetAmount.optional(),
    deadline: goalFields.deadline,
    icon: goalFields.icon,
    priority: goalFields.priority,
    status: z.enum(['active', 'archived']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

export const contributionSchema = z.object({
  amount,
  type: z.enum(['deposit', 'withdrawal']).default('deposit'),
  date: dateOnly.optional(),
  note: z.string().trim().max(120).optional().default(''),
});

export const goalListQuery = z.object({ status: z.enum(['active', 'completed', 'archived']).optional() });

export const contributionParams = z.object({ id: objectId, contributionId: objectId });
