import { beforeAll, describe, it, expect } from 'vitest';
import { createApp } from '../../src/app.js';
import { browserAgent, uniqueEmail } from '../helpers.js';
import { addDaysUtc, addMonthsUtc, startOfMonthUtc, toDateOnly, todayUtc } from '../../src/utils/dates.js';

const app = createApp();
const today = todayUtc();
const thisMonth = startOfMonthUtc(today);

async function signedInAgent() {
  const agent = browserAgent(app);
  await agent.post('/api/auth/register').send({ name: 'Analyst', email: uniqueEmail(), password: 'Sp3ndFlow!pass' });
  return agent;
}

async function add(agent, type, amount, category, date, description = category) {
  const res = await agent.post('/api/transactions').send({ type, amount, category, description, date: toDateOnly(date), paymentMethod: 'UPI' });
  expect(res.status).toBe(201);
}

describe('dashboard and analytics', () => {
  let agent;

  beforeAll(async () => {
    agent = await signedInAgent();
    // Three completed months of history plus this month.
    for (let m = 3; m >= 1; m -= 1) {
      const month = addMonthsUtc(thisMonth, -m);
      await add(agent, 'income', 80000, 'Salary', month);
      await add(agent, 'expense', 20000, 'Rent & Housing', addDaysUtc(month, 2));
      for (let i = 0; i < 6; i += 1) await add(agent, 'expense', 400 + i * 50, 'Shopping', addDaysUtc(month, 5 + i));
    }
    await add(agent, 'income', 80000, 'Salary', thisMonth);
    await add(agent, 'expense', 20000, 'Rent & Housing', thisMonth);
    await add(agent, 'expense', 25000, 'Shopping', today, 'New phone');
    await agent.post('/api/goals').send({ name: 'Cushion', targetAmount: 100000, initialAmount: 30000 });
  });

  it('builds the dashboard from server-side calculations', async () => {
    const res = await agent.get('/api/dashboard');
    expect(res.status).toBe(200);
    const d = res.body.data;

    expect(d.balance).toMatchObject({ income: 320000, expense: 3 * (20000 + 3150) + 45000 });
    expect(d.thisMonth).toMatchObject({ income: 80000, expense: 45000, net: 35000 });
    expect(d.incomeVsExpense).toHaveLength(6);
    expect(d.healthScore.score).toBeGreaterThan(0);
    expect(d.healthScore.factors).toHaveLength(5);
    expect(d.safeToSpend.basis).toBe('cash_flow');
    expect(d.safeToSpend.amount).toBeGreaterThanOrEqual(0);
    expect(d.recentTransactions[0].description).toBe('New phone');
    expect(d.goals[0]).toMatchObject({ name: 'Cushion', saved: 30000 });
    expect(d.goals[0]).not.toHaveProperty('contributions');
    expect(d.unusualExpenses[0]).toMatchObject({ description: 'New phone', reason: 'category' });
  });

  it('returns the analytics overview with previous-period comparison', async () => {
    const res = await agent.get('/api/analytics/overview?range=6m');
    expect(res.status).toBe(200);
    const a = res.body.data;
    expect(a.range.granularity).toBe('month');
    expect(a.series).toHaveLength(6);
    expect(a.totals.income).toBe(320000);
    expect(a.categories[0].category).toBe('Rent & Housing');
    expect(a.categories.reduce((s, c) => s + c.share, 0)).toBeCloseTo(100, 0);
    expect(a.weekdays.map((w) => w.day)[0]).toBe('Monday');
    expect(a.paymentMethods[0]).toMatchObject({ method: 'UPI', share: 100 });
  });

  it('serves the heatmap, unusual list, cash-flow projection and CSV report', async () => {
    const heat = await agent.get('/api/analytics/heatmap?days=120');
    expect(heat.body.data.days.length).toBeGreaterThan(5);
    expect(heat.body.data.thresholds).toHaveLength(4);

    const unusual = await agent.get('/api/analytics/unusual');
    expect(unusual.body.data.items.map((i) => i.description)).toContain('New phone');

    const flow = await agent.get('/api/analytics/cashflow?months=3');
    expect(flow.body.data).toMatchObject({ enoughData: true, basis: { income: 'recent_average' } });
    expect(flow.body.data.months).toHaveLength(3);

    const csv = await agent.get('/api/analytics/report?range=6m');
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text).toContain('Expense category,Shopping');
  });

  it('validates ranges', async () => {
    expect((await agent.get('/api/analytics/overview?range=custom')).status).toBe(422);
    expect((await agent.get('/api/analytics/overview?range=forever')).status).toBe(422);
  });

  it("never mixes in another user's data", async () => {
    const stranger = await signedInAgent();
    const d = (await stranger.get('/api/dashboard')).body.data;
    expect(d.balance).toMatchObject({ income: 0, expense: 0, transactionCount: 0 });
    expect(d.healthScore.score).toBeNull();
    expect(d.safeToSpend.basis).toBe('insufficient_data');
    expect(d.recentTransactions).toEqual([]);
    expect((await stranger.get('/api/analytics/overview?range=12m')).body.data.categories).toEqual([]);
    expect((await stranger.get('/api/analytics/unusual')).body.data.items).toEqual([]);
  });
});
