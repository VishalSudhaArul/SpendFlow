import { z } from 'zod';
import { INCOME_FREQUENCIES, INCOME_SOURCE_TYPES, MAX_AMOUNT, PAYMENT_METHODS } from '../constants/finance.js';
import { amount, dateOnly } from './common.js';

const expectedAmount = z.coerce.number().min(0, 'Cannot be negative').max(MAX_AMOUNT);

export const createIncomeSourceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  type: z.enum(INCOME_SOURCE_TYPES),
  expectedAmount: expectedAmount.default(0),
  frequency: z.enum(INCOME_FREQUENCIES).default('monthly'),
  nextExpectedDate: dateOnly.nullable().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().trim().max(300).optional().default(''),
});

export const updateIncomeSourceSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    type: z.enum(INCOME_SOURCE_TYPES).optional(),
    expectedAmount: expectedAmount.optional(),
    frequency: z.enum(INCOME_FREQUENCIES).optional(),
    nextExpectedDate: dateOnly.nullable().optional(),
    isActive: z.boolean().optional(),
    notes: z.string().trim().max(300).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

/** Records money received from a source. Amount defaults to the expected amount. */
export const receiveIncomeSchema = z.object({
  amount: amount.optional(),
  date: dateOnly.optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).default('Bank Transfer'),
  description: z.string().trim().min(1).max(120).optional(),
  notes: z.string().trim().max(500).optional().default(''),
});

export const incomeSummaryQuery = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});
