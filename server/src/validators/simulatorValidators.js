import { z } from 'zod';
import { EXPENSE_CATEGORIES, MAX_AMOUNT } from '../constants/finance.js';

const money = z.coerce.number({ error: 'Enter an amount' }).positive('Must be greater than zero').max(MAX_AMOUNT);
const label = z.string().trim().max(60).optional();

const scenario = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('category_change'),
    category: z.enum(EXPENSE_CATEGORIES),
    percent: z.coerce.number().min(-100, 'Cannot cut more than 100%').max(300, 'Up to +300%'),
  }),
  z
    .object({
      type: z.literal('income_change'),
      percent: z.coerce.number().min(-100).max(300).optional(),
      amount: z.coerce.number().min(-MAX_AMOUNT).max(MAX_AMOUNT).optional(),
    })
    .refine((s) => s.percent !== undefined || s.amount !== undefined, 'Give a percentage or an amount'),
  z.object({ type: z.literal('recurring_saving'), amount: money, label }),
  z.object({ type: z.literal('recurring_expense'), amount: money, label }),
  z.object({
    type: z.literal('one_time_purchase'),
    amount: money,
    label,
    month: z.coerce.number().int().min(1).max(24).default(1),
    emiMonths: z.coerce.number().int().min(2).max(60).optional(),
    annualInterestRate: z.coerce.number().min(0).max(48).optional(),
  }),
]);

export const simulationSchema = z.object({
  scenarios: z.array(scenario).min(1, 'Add at least one change to simulate').max(8, 'Up to 8 changes at once'),
  months: z.coerce.number().int().min(1).max(24).default(12),
});
