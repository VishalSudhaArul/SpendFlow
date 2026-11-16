import { z } from 'zod';
import { dateOnly, objectId } from './common.js';
import { addDaysUtc, parseDateOnly, todayUtc } from '../utils/dates.js';

/**
 * The client sends its own local date so "yesterday" means the user's
 * yesterday. It must be within a day of the server's UTC date (time zones).
 */
const clientToday = dateOnly.refine((value) => {
  const date = parseDateOnly(value);
  const today = todayUtc();
  return date >= addDaysUtc(today, -1) && date <= addDaysUtc(today, 1);
}, 'Invalid local date');

export const chatSchema = z.object({
  message: z.string().trim().min(1, 'Type a question').max(1000, 'Keep questions under 1000 characters'),
  conversationId: objectId.optional(),
});

export const parseTransactionSchema = z.object({
  text: z.string().trim().min(3, 'Describe the transaction').max(300, 'Keep it under 300 characters'),
  today: clientToday,
});

export const summaryQuery = z.object({
  today: clientToday,
  refresh: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});
