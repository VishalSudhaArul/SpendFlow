import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { USER_DATA_MODELS } from '../../src/services/accountService.js';
import { User } from '../../src/models/User.js';
import { browserAgent, uniqueEmail } from '../helpers.js';
import { addDaysUtc, monthKey, toDateOnly, todayUtc } from '../../src/utils/dates.js';

const app = createApp();
const today = toDateOnly(todayUtc());
const PASSWORD = 'Sp3ndFlow!pass';

async function userWithData() {
  const agent = browserAgent(app);
  const email = uniqueEmail('owner');
  const id = (await agent.post('/api/auth/register').send({ name: 'Owner', email, password: PASSWORD })).body.data.user.id;
  await agent.post('/api/transactions').send({ type: 'expense', amount: 100, category: 'Groceries', description: 'Milk', date: today });
  await agent.post('/api/income/sources').send({ name: 'Job', type: 'salary', expectedAmount: 1000 });
  await agent.post('/api/budgets').send({ month: monthKey(todayUtc()), limit: 500 });
  await agent.post('/api/goals').send({ name: 'Trip', targetAmount: 5000 });
  await agent.post('/api/subscriptions').send({ name: 'Netflix', amount: 649, nextDueDate: toDateOnly(addDaysUtc(todayUtc(), 2)) });
  await agent.get('/api/notifications');
  await agent.post('/api/ai/chat').send({ message: 'hi' });
  return { agent, id, email };
}

describe('account data export', () => {
  it('exports every kind of record, without secrets', async () => {
    const { agent, email } = await userWithData();
    const res = await agent.get('/api/users/me/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="spendflow-export-/);
    const data = res.body;
    expect(data).toMatchObject({ format: 'spendflow-ai-export', version: 1, profile: { email: email.toLowerCase() } });
    for (const key of ['transactions', 'incomeSources', 'budgets', 'savingsGoals', 'subscriptions', 'bills', 'aiConversations']) {
      expect(data[key].length, key).toBeGreaterThan(0);
    }
    expect(JSON.stringify(data)).not.toMatch(/passwordHash|tokenVersion|\$2[aby]\$/);
  });
});

describe('account deletion', () => {
  it('requires the password and explicit confirmation', async () => {
    const { agent } = await userWithData();
    expect((await agent.delete('/api/users/me').send({ password: PASSWORD })).status).toBe(422);
    expect((await agent.delete('/api/users/me').send({ password: 'wrong-pass-1', confirm: 'DELETE' })).status).toBe(400);
    expect((await agent.get('/api/auth/me')).status).toBe(200); // still there
  });

  it('removes the user and every linked record, and ends the session', async () => {
    const { agent, id, email } = await userWithData();
    const bystander = await userWithData();

    const res = await agent.delete('/api/users/me').send({ password: PASSWORD, confirm: 'DELETE' });
    expect(res.status).toBe(200);
    expect(res.body.data.records.Transaction).toBe(1);
    expect(res.headers['set-cookie'][0]).toMatch(/sf_session=;/);

    const userId = new mongoose.Types.ObjectId(id);
    expect(await User.exists({ _id: userId })).toBeNull();
    for (const [name, Model] of Object.entries(USER_DATA_MODELS)) {
      expect(await Model.countDocuments({ userId }), name).toBe(0);
    }
    expect((await agent.get('/api/auth/me')).status).toBe(401);
    expect((await browserAgent(app).post('/api/auth/login').send({ email, password: PASSWORD })).status).toBe(401);

    // Other users are untouched.
    expect((await bystander.agent.get('/api/transactions')).body.data.items).toHaveLength(1);
  });

  it('covers every collection that stores user data', () => {
    const modelsWithUserId = mongoose.modelNames().filter((name) => name !== 'User' && mongoose.model(name).schema.path('userId'));
    expect(modelsWithUserId.sort()).toEqual(Object.keys(USER_DATA_MODELS).sort());
  });
});
