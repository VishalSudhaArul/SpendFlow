import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../models/User.js';

export const emailSchema = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email({ error: 'Enter a valid email address' }));

// bcrypt only uses the first 72 bytes of a password, so longer ones are rejected
// rather than silently truncated.
export const passwordSchema = z
  .string({ error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), 'Password must contain a letter and a number');

const nameSchema = z
  .string({ error: 'Name is required' })
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(60, 'Name must be at most 60 characters');

const currencySchema = z.enum(SUPPORTED_CURRENCIES, { error: 'Unsupported currency' });

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  currency: currencySchema.optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  // Don't apply the strength rules on login: just require something was typed.
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required').max(200),
});

export const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    currency: currencySchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(200),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current one',
  });
