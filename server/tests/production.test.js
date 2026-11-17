/**
 * Behaviour that only applies with NODE_ENV=production.
 * Modules are re-imported after switching the environment.
 */
import request from 'supertest';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

let createApp;
let sessionCookieOptions;

beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.resetModules();
  ({ createApp } = await import('../src/app.js'));
  ({ sessionCookieOptions } = await import('../src/services/tokenService.js'));
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('production mode', () => {
  it('health check reveals no configuration details', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(Object.keys(res.body.data).sort()).toEqual(['service', 'status', 'timestamp']);
    expect(res.status).toBe(503); // no database connected in unit tests → honest "degraded"
  });

  it('session cookies are Secure', () => {
    expect(sessionCookieOptions()).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax', path: '/api' });
  });
});
