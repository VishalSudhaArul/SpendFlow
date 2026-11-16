import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const AUTH_COOKIE = 'sf_session';
const ISSUER = 'spendflow-ai';
const AUDIENCE = 'spendflow-ai-web';

function secret() {
  if (!env.JWT_SECRET) {
    // Startup refuses to run without it, so this only triggers in misconfigured tests.
    throw new Error('JWT_SECRET is not configured');
  }
  return env.JWT_SECRET;
}

/** Signs a session token. The payload holds only the user id and token version — no personal data. */
export function signSessionToken(user) {
  return jwt.sign({ tv: user.tokenVersion ?? 0 }, secret(), {
    algorithm: 'HS256',
    subject: user._id.toString(),
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: `${env.JWT_EXPIRES_IN_DAYS}d`,
  });
}

/** Returns { userId, tokenVersion } or throws if the token is invalid/expired. */
export function verifySessionToken(token) {
  const payload = jwt.verify(token, secret(), {
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return { userId: payload.sub, tokenVersion: payload.tv ?? 0 };
}

/**
 * The JWT lives in an httpOnly cookie, so page JavaScript (and any injected
 * script) can never read it.
 */
export function sessionCookieOptions() {
  const sameSite = env.COOKIE_SAME_SITE;
  return {
    httpOnly: true,
    secure: env.isProduction || sameSite === 'none',
    sameSite,
    path: '/api',
    maxAge: env.JWT_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
  };
}

export function setSessionCookie(res, user) {
  res.cookie(AUTH_COOKIE, signSessionToken(user), sessionCookieOptions());
}

export function clearSessionCookie(res) {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();
  res.clearCookie(AUTH_COOKIE, options);
}
