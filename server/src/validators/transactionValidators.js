import { z } from 'zod';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  TRANSACTION_TYPES,
  categoriesFor,
} from '../constants/finance.js';
import { amount, dateOnly, listOf, objectId, pagination } from './common.js';

const ALL_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];

const baseFields = {
  type: z.enum(TRANSACTION_TYPES, { error: 'Type must be income or expense' }),
  amount,
  category: z.string().trim().min(1, 'Category is required'),
  description: z.string().trim().min(1, 'Description is required').max(120),
  paymentMethod: z.enum(PAYMENT_METHODS).default('UPI'),
  date: dateOnly,
  notes: z.string().trim().max(500).optional().default(''),
  incomeSourceId: objectId.nullable().optional(),
};

function categoryMatchesType(data, ctx) {
  if (data.type && data.category && !categoriesFor(data.type).includes(data.category)) {
    ctx.addIssue({
      code: 'custom',
      path: ['category'],
      message: `Choose a valid ${data.type} category`,
    });
  }
}

export const createTransactionSchema = z
  .object({
    ...baseFields,
    // 'ai' marks a transaction the user confirmed from a natural-language preview.
    origin: z.enum(['manual', 'ai']).default('manual'),
  }).superRefine(categoryMatchesType);

// Partial update. Type/category consistency is re-checked in the service against the stored record.
export const updateTransactionSchema = z
  .object({
    type: baseFields.type.optional(),
    amount: amount.optional(),
    category: baseFields.category.optional(),
    description: baseFields.description.optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    date: dateOnly.optional(),
    notes: z.string().trim().max(500).optional(),
    incomeSourceId: objectId.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

export const SORTS = {
  date_desc: { date: -1, _id: -1 },
  date_asc: { date: 1, _id: 1 },
  amount_desc: { amount: -1, _id: -1 },
  amount_asc: { amount: 1, _id: 1 },
};

const filterFields = {
  type: z.enum(TRANSACTION_TYPES).optional(),
  category: listOf(z.enum(ALL_CATEGORIES)),
  paymentMethod: listOf(z.enum(PAYMENT_METHODS)),
  incomeSourceId: objectId.optional(),
  search: z.string().trim().max(80).optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
};

function rangesAreOrdered(data, ctx) {
  if (data.from && data.to && data.from > data.to) {
    ctx.addIssue({ code: 'custom', path: ['to'], message: '"To" date must be on or after "from" date' });
  }
  if (data.minAmount !== undefined && data.maxAmount !== undefined && data.minAmount > data.maxAmount) {
    ctx.addIssue({ code: 'custom', path: ['maxAmount'], message: 'Maximum must be at least the minimum' });
  }
}

export const listTransactionsQuery = z
  .object({
    ...filterFields,
    ...pagination,
    sort: z.enum(Object.keys(SORTS)).default('date_desc'),
  })
  .superRefine(rangesAreOrdered);

export const exportTransactionsQuery = z
  .object({ ...filterFields, sort: z.enum(Object.keys(SORTS)).default('date_desc') })
  .superRefine(rangesAreOrdered);
