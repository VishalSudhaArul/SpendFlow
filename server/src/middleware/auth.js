import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { AUTH_COOKIE, clearSessionCookie, verifySessionToken } from '../services/tokenService.js';

/**
 * Requires a valid session cookie. On success sets:
 *   req.user   — the user document (without password hash)
 *   req.userId — the user's ObjectId, used to scope every data query to its owner
 */
export async function requireAuth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return next(ApiError.unauthorized());

  let session;
  try {
    session = verifySessionToken(token);
  } catch {
    clearSessionCookie(res);
    return next(ApiError.unauthorized('Your session has expired. Please sign in again.'));
  }

  const user = await User.findById(session.userId).select('+tokenVersion');
  if (!user || user.tokenVersion !== session.tokenVersion) {
    clearSessionCookie(res);
    return next(ApiError.unauthorized('Your session is no longer valid. Please sign in again.'));
  }

  req.user = user;
  req.userId = user._id;
  return next();
}
