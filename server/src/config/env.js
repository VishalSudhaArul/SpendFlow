import dotenv from 'dotenv';
import { z } from 'zod';

// Load server/.env (if present). `quiet` stops dotenv from printing anything,
// so nothing about secrets ever reaches the console.
dotenv.config({ quiet: true });

const optionalSecret = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  CLIENT_URL: z
    .string()
    .trim()
    .default('http://localhost:5173')
    // Allow a comma-separated list of origins, e.g. for a deployed frontend + localhost.
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
    .pipe(z.array(z.url({ message: 'CLIENT_URL must contain valid URLs' })).min(1)),
  MONGODB_URI: optionalSecret.refine(
    (value) => value === undefined || /^mongodb(\+srv)?:\/\//.test(value),
    'MONGODB_URI must start with mongodb+srv:// or mongodb://',
  ),
  MONGODB_DB_NAME: z.string().trim().min(1).default('spendflow-ai'),
  JWT_SECRET: optionalSecret.refine(
    (value) => value === undefined || value.length >= 32,
    'JWT_SECRET must be at least 32 characters long',
  ),
  JWT_EXPIRES_IN_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  // "lax" works when the client and API share a site (localhost, or the API proxied
  // under the frontend's domain). Use "none" only if they live on different sites.
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  GEMINI_API_KEY: optionalSecret,
  GEMINI_MODEL: z.string().trim().min(1).default('gemini-3.8-flash'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Report which variables are wrong without echoing their values.
  const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
  console.error(`[config] Invalid environment configuration:\n${problems.join('\n')}`);
  process.exit(1);
}

export const env = Object.freeze({
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
});
