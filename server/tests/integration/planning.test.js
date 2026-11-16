import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app.js';
import { browserAgent, uniqueEmail } from '../helpers.js';
import { addMonthsUtc, monthKey, startOfMonthUtc, toDateOnly, todayUtc } from '../../src/utils/dates.js';

const app = createApp();
const thisMonth = startOfMonthUtc(todayUtc());
const MONTH = monthKey(thisMonth);
const firstOfMonth = toDateOnly(thisMonth);

async function signedInAgent() {
  const agent = browserAgent(app);
  await agent.post('/api/auth/register').send({ name: 'Planner', email: uniqueEmail(), password: 'Sp3ndFlow!pass' });
  return agent;
}

async function spend(agent, category, amount, date = firstOfMonth) {
  const res = await agent
    .post('/api/transactions')
    .send({ type: 'expense', amount, category, description: category, date, paymentMethod: 'UPI' });
  expect(res.status).toBe(201);
}

describe('budgets', () => {
  it('tracks spending against overall and category budgets', async () => {
    const agent = await signedInAgent();
    await spend(agent, 'Groceries', 4500);
    await spend(agent, 'Food & Dining', 3000);
    await spend(agent, 'Transport', 800);

    expect((await agent.post('/api/budgets').send({ month: MONTH, limit: 20000 })).status).toBe(201);
    await agent.post('/api/budgets').send({ month: MONTH, category: 'Groceries', limit: 5000 });
    await agent.post('/api/budgets').send({ month: MONTH, category: 'Food & Dining', limit: 2500 });

    const res = await agent.get(`/api/budgets?month=${MONTH}`);
    expect(res.status).toBe(200);
    const data = res.body.data;

    expect(data.totalSpent).toBe(8300);
    expect(data.overall).toMatchObject({ limit: 20000, spent: 8300, category: null });
    const byCategory = Object.fromEntries(data.categories.map((b) => [b.category, b]));
    expect(byCategory['Food & Dining']).toMatchObject({ spent: 3000, status: 'over', remaining: -500 });
    expect(byCategory.Groceries).toMatchObject({ spent: 4500, status: 'warning', reason: 'threshold_reached' });
    expect(data.unbudgeted).toEqual([{ category: 'Transport', spent: 800 }]);
    // (The overall budget may also warn early in a month because of its run-rate, so only check categories.)
    const categoryAlerts = data.alerts.filter((a) => a.category !== null).map((a) => a.category);
    expect(categoryAlerts.sort()).toEqual(['Food & Dining', 'Groceries']);
  });

  it('upserts instead of duplicating a category budget, and validates input', async () => {
    const agent = await signedInAgent();
    await agent.post('/api/budgets').send({ month: MONTH, category: 'Shopping', limit: 3000 });
    await agent.post('/api/budgets').send({ month: MONTH, category: 'Shopping', limit: 4000 });
    const res = await agent.get(`/api/budgets?month=${MONTH}`);
    expect(res.body.data.categories).toHaveLength(1);
    expect(res.body.data.categories[0].limit).toBe(4000);

    expect((await agent.post('/api/budgets').send({ month: MONTH, category: 'Salary', limit: 100 })).status).toBe(422);
    expect((await agent.post('/api/budgets').send({ month: '2026-13', limit: 100 })).status).toBe(422);
  });

  it('copies budgets to the next month and applies bulk plans', async () => {
    const agent = await signedInAgent();
    const next = monthKey(addMonthsUtc(thisMonth, 1));
    await agent.post('/api/budgets/bulk').send({
      month: MONTH,
      items: [{ category: null, limit: 30000 }, { category: 'Groceries', limit: 6000 }, { category: 'Transport', limit: 2000 }],
    });

    const copy = await agent.post('/api/budgets/copy').send({ fromMonth: MONTH, toMonth: next });
    expect(copy.body.data).toEqual({ copied: 3, skipped: 0 });
    const again = await agent.post('/api/budgets/copy').send({ fromMonth: MONTH, toMonth: next });
    expect(again.body.data).toEqual({ copied: 0, skipped: 3 });

    const nextMonth = await agent.get(`/api/budgets?month=${next}`);
    expect(nextMonth.body.data.overall.limit).toBe(30000);
    expect(nextMonth.body.data.categories).toHaveLength(2);
  });

  it('recommends limits from previous months and builds a 50/30/20 plan', async () => {
    const agent = await signedInAgent();
    for (let i = 1; i <= 3; i += 1) {
      const date = toDateOnly(addMonthsUtc(thisMonth, -i));
      await spend(agent, 'Rent & Housing', 20000, date);
      await spend(agent, 'Food & Dining', 4000 + i * 100, date);
    }

    const recs = await agent.get(`/api/budgets/recommendations?month=${MONTH}`);
    expect(recs.body.data.basedOnMonths).toHaveLength(3);
    expect(recs.body.data.items.map((r) => [r.category, r.suggestedLimit])).toEqual([
      ['Rent & Housing', 20000],
      ['Food & Dining', 4500],
    ]);

    const noIncome = await agent.get(`/api/budgets/fifty-thirty-twenty?month=${MONTH}`);
    expect(noIncome.status).toBe(422);
    expect(noIncome.body.error.code).toBe('INCOME_REQUIRED');

    const plan = await agent.get(`/api/budgets/fifty-thirty-twenty?month=${MONTH}&income=80000`);
    expect(plan.body.data).toMatchObject({ incomeBasis: 'provided', monthlyIncome: 80000 });
    expect(plan.body.data.needs).toMatchObject({ target: 40000, actual: 20000 });
    expect(plan.body.data.wants.target).toBe(24000);
    expect(plan.body.data.savings.target).toBe(16000);
  });

  it("cannot see or edit another user's budgets", async () => {
    const owner = await signedInAgent();
    const other = await signedInAgent();
    const { body } = await owner.post('/api/budgets').send({ month: MONTH, category: 'Travel', limit: 9000 });
    const id = body.data.budget.id;

    expect((await other.patch(`/api/budgets/${id}`).send({ limit: 1 })).status).toBe(404);
    expect((await other.delete(`/api/budgets/${id}`)).status).toBe(404);
    expect((await other.get(`/api/budgets?month=${MONTH}`)).body.data.categories).toHaveLength(0);
  });
});

describe('savings goals', () => {
  it('tracks contributions, completes the goal and reopens on withdrawal', async () => {
    const agent = await signedInAgent();
    const deadline = toDateOnly(addMonthsUtc(todayUtc(), 5));
    const created = await agent
      .post('/api/goals')
      .send({ name: 'Emergency fund', targetAmount: 50000, deadline, initialAmount: 10000, icon: 'shield', priority: 'high' });
    expect(created.status).toBe(201);
    const goal = created.body.data.goal;
    expect(goal).toMatchObject({ saved: 10000, remaining: 40000, percent: 20, monthsLeft: 5, requiredMonthly: 8000, status: 'active' });
    expect(goal.contributions).toHaveLength(1);

    const deposit = await agent.post(`/api/goals/${goal.id}/contributions`).send({ amount: 40000, note: 'Bonus' });
    expect(deposit.body.data.justCompleted).toBe(true);
    expect(deposit.body.data.goal).toMatchObject({ status: 'completed', saved: 50000, pace: 'reached' });

    const tooMuch = await agent.post(`/api/goals/${goal.id}/contributions`).send({ amount: 60000, type: 'withdrawal' });
    expect(tooMuch.status).toBe(422);

    const withdraw = await agent.post(`/api/goals/${goal.id}/contributions`).send({ amount: 5000, type: 'withdrawal' });
    expect(withdraw.body.data.goal).toMatchObject({ status: 'active', saved: 45000 });

    const contributionId = withdraw.body.data.goal.contributions.find((c) => c.amount === -5000).id;
    const undo = await agent.delete(`/api/goals/${goal.id}/contributions/${contributionId}`);
    expect(undo.body.data.goal).toMatchObject({ saved: 50000, status: 'completed' });

    const list = await agent.get('/api/goals');
    expect(list.body.data.summary).toMatchObject({ activeCount: 0, completedCount: 1 });
  });

  it('archives goals and blocks deposits into archived goals', async () => {
    const agent = await signedInAgent();
    const { body } = await agent.post('/api/goals').send({ name: 'New laptop', targetAmount: 80000 });
    const id = body.data.goal.id;

    const archived = await agent.patch(`/api/goals/${id}`).send({ status: 'archived' });
    expect(archived.body.data.goal.status).toBe('archived');
    expect((await agent.post(`/api/goals/${id}/contributions`).send({ amount: 100 })).status).toBe(400);
  });

  it("isolates goals between users", async () => {
    const owner = await signedInAgent();
    const other = await signedInAgent();
    const { body } = await owner.post('/api/goals').send({ name: 'Trip', targetAmount: 30000 });
    const id = body.data.goal.id;

    expect((await other.post(`/api/goals/${id}/contributions`).send({ amount: 100 })).status).toBe(404);
    expect((await other.patch(`/api/goals/${id}`).send({ name: 'Mine' })).status).toBe(404);
    expect((await other.delete(`/api/goals/${id}`)).status).toBe(404);
    expect((await other.get('/api/goals')).body.data.items).toHaveLength(0);
  });
});
