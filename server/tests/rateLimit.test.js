/**
 * Brute-force protection on login. Kept in its own file so the exhausted
 * limiter doesn't affect other tests (each test file gets fresh modules).
 */
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('login rate limiting', () => {
  it('blocks after 20 failed attempts in 15 minutes', async () => {
    const attempt = () => request(app).post('/api/auth/login').set('X-Requested-With', 'SpendFlow').send({ email: 'not-an-email', password: 'x' });
    for (let i = 0; i < 20; i += 1) {
      expect((await attempt()).status).toBe(422);
    }
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ success: false, error: { code: 'RATE_LIMITED' } });
    expect(blocked.headers).toHaveProperty('retry-after');
  });
});
