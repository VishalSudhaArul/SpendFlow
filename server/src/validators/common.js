import mongoose from 'mongoose';
import { z } from 'zod';
import { MAX_AMOUNT } from '../constants/finance.js';
import { isDateOnly } from '../utils/dates.js';

export const objectId = z
  .string()
  .refine((value) => mongoose.isValidObjectId(value) && /^[a-f\d]{24}$/i.test(value), 'Invalid id');

export const idParams = z.object({ id: objectId });

export const dateOnly = z.string().trim().refine(isDateOnly, 'Use the format YYYY-MM-DD');

export const amount = z.coerce
  .number({ error: 'Amount must be a number' })
  .positive('Amount must be greater than zero')
  .max(MAX_AMOUNT, 'Amount is too large')
  .refine((value) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6, 'Use at most 2 decimal places');

export const pagination = {
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

/** Accepts "a,b" or repeated query params (?category=a&category=b) as a string array. */
export function listOf(itemSchema) {
  return z.preprocess((value) => {
    if (value === undefined || value === '') return undefined;
    const list = Array.isArray(value) ? value : String(value).split(',');
    return list.map((item) => String(item).trim()).filter(Boolean);
  }, z.array(itemSchema).max(30).optional());
}
