import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app.js';
import { sessionCookieOptions, signSessionToken, verifySessionToken } from '../src/services/tokenService.js';
import { changePasswordSchema, loginSchema, registerSchema } from '../src/validators/authValidators.js';

const app = createApp();
const fakeUser = { _id: { toString: () => '65f000000000000000000001' }, tokenVersion: 3 };

describe('session tokens', () => {
  it('round-trips the user id and token version only', () => {
    const token = signSessionToken(fakeUser);
    expect(verifySessionToken(token)).toEqual({ userId: '65f000000000000000000001', tokenVersion: 3 });

    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    expect(Object.keys(payload).sort()).toEqual(['aud', 'exp', 'iat', 'iss', 'sub', 'tv']);
  });

  it('rejects tampered tokens', () => {
    const token = signSessionToken(fakeUser);
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'someone-else', tv: 3 })).toString('base64url');
    expect(() => verifySessionToken(`${header}.${forged}.${signature}`)).toThrow();
  });

  it('uses an httpOnly cookie scoped to the API', () => {
    const options = sessionCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe('/api');
    expect(options.sameSite).toBe('lax');
  });
});

describe('auth validators', () => {
  it('normalizes email and enforces password strength on register', () => {
    const ok = registerSchema.safeParse({ name: ' Asha ', email: ' Asha@Example.COM ', password: 'secure123' });
    expect(ok.success).toBe(true);
    expect(ok.data).toMatchObject({ name: 'Asha', email: 'asha@example.com' });

    expect(registerSchema.safeParse({ name: 'Asha', email: 'a@b.co', password: 'short1' }).success).toBe(false);
    expect(registerSchema.safeParse({ name: 'Asha', email: 'a@b.co', password: 'onlyletters' }).success).toBe(false);
    expect(registerSchema.safeParse({ name: 'Asha', email: 'a@b.co', password: `a1${'x'.repeat(71)}` }).success).toBe(false);
    expect(registerSchema.safeParse({ name: 'Asha', email: 'not-an-email', password: 'secure123' }).success).toBe(false);
  });

  it('does not apply strength rules on login', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
  });

  it('requires the new password to differ from the current one', () => {
    const result = changePasswordSchema.safeParse({ currentPassword: 'secure123', newPassword: 'secure123' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['newPassword']);
  });
});

describe('auth HTTP guards (no database needed)', () => {
  it('GET /api/auth/me without a session returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an invalid session cookie and clears it', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'sf_session=garbage');
    expect(res.status).toBe(401);
    expect(res.headers['set-cookie']?.[0]).toMatch(/sf_session=;/);
  });

  it('blocks state-changing requests without the CSRF header', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x' });
    expect(res.status).toBe(403);
  });

  it('validates register input before touching the database', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('X-Requested-With', 'SpendFlow')
      .send({ name: 'A', email: 'bad', password: '123' });
    expect(res.status).toBe(422);
    const paths = [...new Set(res.body.error.details.map((d) => d.path))].sort();
    expect(paths).toEqual(['email', 'name', 'password']);
  });
});
