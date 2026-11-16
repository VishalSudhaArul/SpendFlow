import { z } from 'zod';
import { dateOnly } from './common.js';

export const RANGES = ['7d', '30d', '90d', '6m', '12m', 'ytd', 'custom'];

export const analyticsQuery = z
  .object({
    range: z.enum(RANGES).default('30d'),
    from: dateOnly.optional(),
    to: dateOnly.optional(),
    granularity: z.enum(['day', 'week', 'month', 'year']).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.range === 'custom' && (!data.from || !data.to)) {
      ctx.addIssue({ code: 'custom', path: ['from'], message: 'Choose a start and end date' });
    }
    if (data.from && data.to && data.from > data.to) {
      ctx.addIssue({ code: 'custom', path: ['to'], message: '"To" must be on or after "from"' });
    }
  });

export const heatmapQuery = z.object({ days: z.coerce.number().int().min(28).max(366).default(365) });
export const unusualQuery = z.object({ days: z.coerce.number().int().min(7).max(365).default(90) });
export const cashflowQuery = z.object({ months: z.coerce.number().int().min(1).max(12).default(6) });
