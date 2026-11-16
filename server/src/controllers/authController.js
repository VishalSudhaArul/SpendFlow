import { registerUser, authenticate } from '../services/authService.js';
import { clearSessionCookie, setSessionCookie } from '../services/tokenService.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export async function register(req, res) {
  const user = await registerUser(req.body);
  setSessionCookie(res, user);
  sendCreated(res, { user });
}

export async function login(req, res) {
  const user = await authenticate(req.body);
  setSessionCookie(res, user);
  sendSuccess(res, { user });
}

export function logout(_req, res) {
  clearSessionCookie(res);
  sendSuccess(res, { loggedOut: true });
}

export function me(req, res) {
  sendSuccess(res, { user: req.user });
}
