import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { browserAgent, uniqueEmail } from '../helpers.js';

const app = createApp();
const PASSWORD = 'Sp3ndFlow!pass';

async function registeredAgent(overrides = {}) {
  const agent = browserAgent(app);
  const email = uniqueEmail();
  const res = await agent.post('/api/auth/register').send({ name: 'Test User', email, password: PASSWORD, ...overrides });
  return { agent, email, res };
}

describe('registration', () => {
  it('creates a user, hashes the password and starts a session', async () => {
    const { agent, email, res } = await registeredAgent();

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ name: 'Test User', email, currency: 'INR' });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.user).not.toHaveProperty('tokenVersion');

    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^sf_session=/);
    expect(cookie).toMatch(/HttpOnly/i);

    const stored = await User.findOne({ email }).select('+passwordHash');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(stored.passwordHash).not.toContain(PASSWORD);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(email);
  });

  it('rejects a duplicate email regardless of case', async () => {
    const { email } = await registeredAgent();
    const res = await browserAgent(app)
      .post('/api/auth/register')
      .send({ name: 'Copy Cat', email: email.toUpperCase(), password: PASSWORD });
    expect(res.status).toBe(409);
  });
});

describe('login and logout', () => {
  it('logs in with correct credentials and out again', async () => {
    const { email } = await registeredAgent();
    const agent = browserAgent(app);

    const login = await agent.post('/api/auth/login').send({ email, password: PASSWORD });
    expect(login.status).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(200);

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    const { email } = await registeredAgent();

    const wrongPassword = await browserAgent(app).post('/api/auth/login').send({ email, password: 'wrong-pass-1' });
    const unknownEmail = await browserAgent(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail('nobody'), password: PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });
});

describe('profile and password', () => {
  it('updates name and currency but ignores protected fields', async () => {
    const { agent, email } = await registeredAgent();
    const res = await agent.patch('/api/users/me').send({ name: 'Renamed', currency: 'USD', email: 'hacker@example.test' });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ name: 'Renamed', currency: 'USD', email });
  });

  it('changing the password signs out other sessions but keeps this one', async () => {
    const { agent: thisDevice, email } = await registeredAgent();
    const otherDevice = browserAgent(app);
    await otherDevice.post('/api/auth/login').send({ email, password: PASSWORD });

    const wrong = await thisDevice
      .patch('/api/users/me/password')
      .send({ currentPassword: 'not-my-pass-1', newPassword: 'N3wPassword!' });
    expect(wrong.status).toBe(400);

    const ok = await thisDevice
      .patch('/api/users/me/password')
      .send({ currentPassword: PASSWORD, newPassword: 'N3wPassword!' });
    expect(ok.status).toBe(200);

    expect((await thisDevice.get('/api/auth/me')).status).toBe(200);
    expect((await otherDevice.get('/api/auth/me')).status).toBe(401);

    const oldLogin = await browserAgent(app).post('/api/auth/login').send({ email, password: PASSWORD });
    expect(oldLogin.status).toBe(401);
    const newLogin = await browserAgent(app).post('/api/auth/login').send({ email, password: 'N3wPassword!' });
    expect(newLogin.status).toBe(200);
  });

  it('profile routes require a session', async () => {
    const res = await browserAgent(app).patch('/api/users/me').send({ name: 'Nobody' });
    expect(res.status).toBe(401);
  });
});
