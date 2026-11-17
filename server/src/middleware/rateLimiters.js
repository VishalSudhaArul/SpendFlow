import { rateLimit } from 'express-rate-limit';

function limitedResponse(message) {
  return { success: false, error: { code: 'RATE_LIMITED', message } };
}

/**
 * Applied to every /api request. A single-page app makes several calls per
 * screen (plus notification polling), so the ceiling is generous for people
 * and still stops scripted abuse. Login and AI routes have stricter limits below.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitedResponse('Too many requests. Please slow down and try again shortly.'),
});

/** Stricter limit for login/registration to slow down password guessing. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: limitedResponse('Too many attempts. Please wait 15 minutes and try again.'),
});

/** Gemini calls cost money and quota, so they get their own budget. */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitedResponse('AI request limit reached. Please wait a minute.'),
});
