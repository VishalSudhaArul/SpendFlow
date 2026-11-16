import { z } from 'zod';

// Mirrors the server's rules (server/src/validators/authValidators.js) so users
// see the same messages before submitting. The server still validates everything.

export const CURRENCIES = [
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'SGD', label: 'Singapore Dollar (S$)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
  { code: 'JPY', label: 'Japanese Yen (¥)' },
];

const email = z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email address'));

export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), 'Password must contain a letter and a number');

const name = z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name must be at most 60 characters');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    name,
    email,
    password,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const profileSchema = z.object({
  name,
  currency: z.enum(CURRENCIES.map((c) => c.code)),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current one',
  });
