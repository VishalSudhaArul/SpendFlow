import { changePassword } from '../services/authService.js';
import { setSessionCookie } from '../services/tokenService.js';
import { sendSuccess } from '../utils/response.js';

export async function updateProfile(req, res) {
  const { name, currency } = req.body;
  if (name !== undefined) req.user.name = name;
  if (currency !== undefined) req.user.currency = currency;
  await req.user.save();
  sendSuccess(res, { user: req.user });
}

export async function updatePassword(req, res) {
  const user = await changePassword(req.userId, req.body);
  // Old sessions were invalidated; give this device a fresh one so the user stays signed in here.
  setSessionCookie(res, user);
  sendSuccess(res, { passwordChanged: true });
}
