import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('API foundation', () => {
  it('GET /api/health returns the standard success envelope', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.integrations).toHaveProperty('database');
  });

  it('health check never leaks secret values', async () => {
    const res = await request(app).get('/api/health');
    const text = JSON.stringify(res.body);

    for (const key of ['MONGODB_URI', 'JWT_SECRET', 'GEMINI_API_KEY']) {
      const value = process.env[key];
      if (value) expect(text).not.toContain(value);
    }
  });

  it('unknown routes return a 404 error envelope', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found: GET /api/does-not-exist' },
    });
  });

  it('malformed JSON returns 400 instead of crashing', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('sets security headers via helmet', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows the configured client origin and rejects others', async () => {
    const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const blocked = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(blocked.status).toBe(403);
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('exposes rate-limit headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers).toHaveProperty('ratelimit-policy');
  });
});
