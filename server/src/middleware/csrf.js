import { ApiError } from '../utils/ApiError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CSRF_HEADER = 'x-requested-with';
export const CSRF_HEADER_VALUE = 'SpendFlow';

/**
 * Cookie-based sessions need CSRF protection. Requiring a custom header on every
 * state-changing request blocks cross-site HTML forms (which cannot set headers),
 * and cross-origin scripts cannot send it without passing the CORS allow-list.
 */
export function csrfGuard(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.get(CSRF_HEADER) !== CSRF_HEADER_VALUE) {
    return next(ApiError.forbidden('Missing or invalid request header'));
  }
  return next();
}
