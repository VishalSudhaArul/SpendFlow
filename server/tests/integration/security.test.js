import { beforeAll, describe, it, expect } from 'vitest';
import { createApp } from '../../src/app.js';
import { Transaction } from '../../src/models/Transaction.js';
import { User } from '../../src/models/User.js';
import { browserAgent, uniqueEmail } from '../helpers.js';
import { addDaysUtc, monthKey, toDateOnly, todayUtc } from '../../src/utils/dates.js';

const app = createApp();
const today = toDateOnly(todayUtc());
const PASSWORD = 'Sp3ndFlow!pass';

async function user(name) {
  const agent = browserAgent(app);
  const email = uniqueEmail(name);
  const res = await agent.post('/api/auth/register').send({ name, email, password: PASSWORD });
  return { agent, id: res.body.data.user.id, email };
}

describe('cross-user access sweep', () => {
  let alice;
  let mallory;
  const ids = {};

  beforeAll(async () => {
    alice = await user('Alice');
    mallory = await user('Mallory');
    const a = alice.agent;
    ids.transaction = (await a.post('/api/transactions').send({ type: 'expense', amount: 100, category: 'Groceries', description: 'Milk', date: today })).body.data.transaction.id;
    ids.source = (await a.post('/api/income/sources').send({ name: 'Job', type: 'salary', expectedAmount: 1000 })).body.data.source.id;
    ids.budget = (await a.post('/api/budgets').send({ month: monthKey(todayUtc()), category: 'Groceries', limit: 500 })).body.data.budget.id;
    ids.goal = (await a.post('/api/goals').send({ name: 'Trip', targetAmount: 5000, initialAmount: 100 })).body.data.goal.id;
    ids.subscription = (await a.post('/api/subscriptions').send({ name: 'Netflix', amount: 649, nextDueDate: toDateOnly(addDaysUtc(todayUtc(), 3)) })).body.data.subscription.id;
    ids.bill = (await a.get('/api/bills')).body.data.items[0].id;
    ids.conversation = (await a.post('/api/ai/chat').send({ message: 'hello' })).body.data.conversation.id;
    ids.notification = (await a.get('/api/notifications')).body.data.items[0]?.id;
  });

  it("returns 404 for every attempt on another user's records", async () => {
    const m = mallory.agent;
    const attempts = [
      m.get(`/api/transactions/${ids.transaction}`),
      m.patch(`/api/transactions/${ids.transaction}`).send({ amount: 1 }),
      m.delete(`/api/transactions/${ids.transaction}`),
      m.patch(`/api/income/sources/${ids.source}`).send({ name: 'x' }),
      m.post(`/api/income/sources/${ids.source}/receive`).send({}),
      m.patch(`/api/budgets/${ids.budget}`).send({ limit: 1 }),
      m.delete(`/api/budgets/${ids.budget}`),
      m.patch(`/api/goals/${ids.goal}`).send({ name: 'x' }),
      m.post(`/api/goals/${ids.goal}/contributions`).send({ amount: 1 }),
      m.patch(`/api/subscriptions/${ids.subscription}`).send({ amount: 1 }),
      m.get(`/api/subscriptions/${ids.subscription}/history`),
      m.post(`/api/bills/${ids.bill}/pay`).send({}),
      m.post(`/api/bills/${ids.bill}/skip`),
      m.get(`/api/ai/conversations/${ids.conversation}`),
      ...(ids.notification ? [m.patch(`/api/notifications/${ids.notification}/read`)] : []),
    ];
    const statuses = (await Promise.all(attempts)).map((r) => r.status);
    expect(new Set(statuses)).toEqual(new Set([404]));

    // Alice's data is untouched.
    const tx = await alice.agent.get(`/api/transactions/${ids.transaction}`);
    expect(tx.body.data.transaction.amount).toBe(100);
  });

  it("never lists another user's data", async () => {
    const m = mallory.agent;
    const lists = await Promise.all([
      m.get('/api/transactions'),
      m.get('/api/income/sources'),
      m.get('/api/goals'),
      m.get('/api/subscriptions'),
      m.get('/api/bills'),
      m.get('/api/ai/conversations'),
    ]);
    for (const res of lists) expect(res.body.data.items).toEqual([]);
    expect((await m.get('/api/dashboard')).body.data.balance.transactionCount).toBe(0);
  });
});

describe('mass assignment and tampering', () => {
  it('ignores userId and protected fields in request bodies', async () => {
    const victim = await user('Victim');
    const attacker = await user('Attacker');

    const created = await attacker.agent.post('/api/transactions').send({
      type: 'expense',
      amount: 50,
      category: 'Shopping',
      description: 'Planted',
      date: today,
      userId: victim.id,
      _id: '65f000000000000000000099',
    });
    expect(created.status).toBe(201);
    const stored = await Transaction.findById(created.body.data.transaction.id);
    expect(stored.userId.toString()).toBe(attacker.id);
    expect(stored._id.toString()).not.toBe('65f000000000000000000099');
    expect((await victim.agent.get('/api/transactions')).body.data.items).toHaveLength(0);

    // Origin values reserved for the server cannot be set by clients.
    const seeded = await attacker.agent.post('/api/transactions').send({ type: 'expense', amount: 1, category: 'Other', description: 'x', date: today, origin: 'seed' });
    expect(seeded.status).toBe(422);

    // Profile update cannot change email, password hash or token version.
    await attacker.agent.patch('/api/users/me').send({ name: 'Renamed', email: victim.email, passwordHash: 'x', tokenVersion: 99 });
    const me = await User.findById(attacker.id).select('+passwordHash +tokenVersion');
    expect(me.name).toBe('Renamed');
    expect(me.email).toBe(attacker.email.toLowerCase());
    expect(me.tokenVersion).toBe(0);
    expect(me.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects malformed ids with 422, not 500', async () => {
    const { agent } = await user('Ids');
    for (const path of ['/api/transactions/not-an-id', '/api/goals/123', "/api/bills/{'$ne':1}/pay"]) {
      const res = path.endsWith('/pay') ? await agent.post(path).send({}) : await agent.get(path);
      expect([404, 422]).toContain(res.status);
      expect(res.status).not.toBe(500);
    }
  });

  it('session cookie is httpOnly, SameSite and scoped to /api', async () => {
    const agent = browserAgent(app);
    const res = await agent.post('/api/auth/register').send({ name: 'Cookie', email: uniqueEmail('cookie'), password: PASSWORD });
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\/api/);
    expect(cookie).not.toMatch(/Domain=/i);
  });
});
