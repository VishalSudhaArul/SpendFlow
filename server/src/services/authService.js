import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

const BCRYPT_ROUNDS = 12;

// Compared against when the email does not exist, so a login for an unknown
// email takes as long as one with a wrong password (no account enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('spendflow-timing-equalizer', BCRYPT_ROUNDS);

export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function registerUser({ name, email, password, currency }) {
  const existing = await User.exists({ email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  try {
    const user = await User.create({ name, email, passwordHash, currency, lastLoginAt: new Date() });
    return user;
  } catch (error) {
    // Two simultaneous sign-ups with the same email: the unique index catches the race.
    if (error?.code === 11000) throw ApiError.conflict('An account with this email already exists');
    throw error;
  }
}

export async function authenticate({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !valid) {
    // Same message for both cases so attackers cannot discover which emails are registered.
    throw ApiError.unauthorized('Invalid email or password');
  }

  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash +tokenVersion');
  if (!user) throw ApiError.unauthorized();

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new ApiError(400, 'Current password is incorrect', {
      details: [{ location: 'body', path: 'currentPassword', message: 'Current password is incorrect' }],
    });
  }

  user.passwordHash = await hashPassword(newPassword);
  // Invalidates every existing session, including ones on other devices.
  user.tokenVersion += 1;
  await user.save();
  return user;
}
