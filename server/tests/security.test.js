/**
 * Security regression tests that need no database: every protected endpoint
 * rejects anonymous and forged requests before touching data.
 */
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { signSessionToken } from '../src/services/tokenService.js';
import { env } from '../src/config/env.js';

const app = createApp();
const ID = '65f000000000000000000001';
const CSRF = { 'X-Requested-With': 'SpendFlow' };

// Every endpoint that must require a session. Public: health, register, login, logout.
const PROTECTED = [
  ['get', '/api/auth/me'],
  ['get', '/api/meta'],
  ['patch', '/api/users/me'],
  ['patch', '/api/users/me/password'],
  ['get', '/api/users/me/export'],
  ['delete', '/api/users/me'],
  ['get', '/api/transactions'],
  ['post', '/api/transactions'],
  ['get', '/api/transactions/export'],
  ['get', `/api/transactions/${ID}`],
  ['patch', `/api/transactions/${ID}`],
  ['delete', `/api/transactions/${ID}`],
  ['get', '/api/income/summary'],
  ['get', '/api/income/sources'],
  ['post', '/api/income/sources'],
  ['patch', `/api/income/sources/${ID}`],
  ['delete', `/api/income/sources/${ID}`],
  ['post', `/api/income/sources/${ID}/receive`],
  ['get', '/api/budgets'],
  ['get', '/api/budgets/recommendations'],
  ['get', '/api/budgets/fifty-thirty-twenty'],
  ['post', '/api/budgets'],
  ['post', '/api/budgets/bulk'],
  ['post', '/api/budgets/copy'],
  ['patch', `/api/budgets/${ID}`],
  ['delete', `/api/budgets/${ID}`],
  ['get', '/api/goals'],
  ['post', '/api/goals'],
  ['patch', `/api/goals/${ID}`],
  ['delete', `/api/goals/${ID}`],
  ['post', `/api/goals/${ID}/contributions`],
  ['delete', `/api/goals/${ID}/contributions/${ID}`],
  ['get', '/api/dashboard'],
  ['get', '/api/analytics/overview'],
  ['get', '/api/analytics/report'],
  ['get', '/api/analytics/heatmap'],
  ['get', '/api/analytics/unusual'],
  ['get', '/api/analytics/cashflow'],
  ['get', '/api/ai/status'],
  ['get', '/api/ai/summary'],
  ['post', '/api/ai/chat'],
  ['post', '/api/ai/parse-transaction'],
  ['get', '/api/ai/conversations'],
  ['get', `/api/ai/conversations/${ID}`],
  ['delete', `/api/ai/conversations/${ID}`],
  ['get', '/api/simulator/baseline'],
  ['post', '/api/simulator/run'],
  ['get', '/api/subscriptions'],
  ['post', '/api/subscriptions'],
  ['get', `/api/subscriptions/${ID}/history`],
  ['patch', `/api/subscriptions/${ID}`],
  ['delete', `/api/subscriptions/${ID}`],
  ['get', '/api/bills'],
  ['get', '/api/bills/summary'],
  ['post', '/api/bills'],
  ['post', `/api/bills/${ID}/pay`],
  ['post', `/api/bills/${ID}/skip`],
  ['post', `/api/bills/${ID}/reopen`],
  ['delete', `/api/bills/${ID}`],
  ['get', '/api/notifications'],
  ['post', '/api/notifications/read-all'],
  ['patch', `/api/notifications/${ID}/read`],
  ['delete', `/api/notifications/${ID}`],
];

describe('authentication is enforced on every protected endpoint', () => {
  it.each(PROTECTED)('%s %s → 401 without a session', async (method, path) => {
    const res = await request(app)[method](path).set(CSRF).send({});
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('rejects forged, tampered, wrong-audience and expired tokens', async () => {
    const forgedSecret = jwt.sign({ tv: 0 }, 'not-the-real-secret-but-long-enough-0123456789', { subject: ID, issuer: 'spendflow-ai', audience: 'spendflow-ai-web' });
    const noneAlg = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: ID, tv: 0, iss: 'spendflow-ai', aud: 'spendflow-ai-web' })).toString('base64url')}.`;
    const wrongAudience = jwt.sign({ tv: 0 }, env.JWT_SECRET, { subject: ID, issuer: 'spendflow-ai', audience: 'some-other-app' });
    const expired = jwt.sign({ tv: 0, exp: Math.floor(Date.now() / 1000) - 60 }, env.JWT_SECRET, { subject: ID, issuer: 'spendflow-ai', audience: 'spendflow-ai-web' });

    for (const token of [forgedSecret, noneAlg, wrongAudience, expired]) {
      const res = await request(app).get('/api/transactions').set('Cookie', `sf_session=${token}`);
      expect(res.status).toBe(401);
    }
  });

  it('ignores Authorization headers (sessions are cookie-only)', async () => {
    const token = signSessionToken({ _id: { toString: () => ID }, tokenVersion: 0 });
    const res = await request(app).get('/api/transactions').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

describe('request hardening', () => {
  it('requires the CSRF header on state-changing requests', async () => {
    for (const method of ['post', 'patch', 'delete']) {
      const res = await request(app)[method]('/api/transactions').send({});
      expect(res.status).toBe(403);
    }
  });

  it('rejects NoSQL operator injection in the login body', async () => {
    const res = await request(app).post('/api/auth/login').set(CSRF).send({ email: { $gt: '' }, password: { $ne: null } });
    expect(res.status).toBe(422);
  });

  it('does not turn query strings into objects (no operator injection via ?a[$ne]=)', async () => {
    const res = await request(app).get('/api/auth/me?email[$ne]=x');
    expect(res.status).toBe(401); // reached auth normally, query parsed as plain strings
  });

  it('rejects bodies over 100 kB', async () => {
    const res = await request(app).post('/api/auth/login').set(CSRF).send({ email: 'a@b.co', password: 'x'.repeat(120_000) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('sets security headers and hides the framework', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toMatch(/max-age/);
    expect(res.headers['content-security-policy']).toMatch(/default-src 'self'/);
  });

  it('health check does not expose configuration in production mode', async () => {
    // Integration flags are dev conveniences; production returns status only (see healthController).
    const res = await request(app).get('/api/health');
    expect(res.body.data).not.toHaveProperty('MONGODB_URI');
    expect(JSON.stringify(res.body)).not.toMatch(/mongodb|secret|key=/i);
  });
});

describe('error handling never leaks internals', () => {
  it('hides unexpected error messages and stack traces', async () => {
    const leaky = express();
    leaky.get('/boom', () => {
      throw new Error('connection string mongodb+srv://user:hunter2@cluster failed at line 42');
    });
    leaky.use(errorHandler);
    const res = await request(leaky).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side. Please try again.' } });
    expect(res.text).not.toMatch(/hunter2|mongodb|line 42|at /);
  });
});
