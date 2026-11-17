import { beforeAll, describe, it, expect } from 'vitest';
import { createApp } from '../../src/app.js';
import { browserAgent, uniqueEmail } from '../helpers.js';
import { addMonthsUtc, startOfMonthUtc, toDateOnly, todayUtc } from '../../src/utils/dates.js';

const app = createApp();
const thisMonth = startOfMonthUtc(todayUtc());

async function signedInAgent() {
  const agent = browserAgent(app);
  await agent.post('/api/auth/register').send({ name: 'Simulator', email: uniqueEmail(), password: 'Sp3ndFlow!pass' });
  return agent;
}

describe('what-if simulator API', () => {
  let agent;

  beforeAll(async () => {
    agent = await signedInAgent();
    for (let m = 3; m >= 1; m -= 1) {
      const date = toDateOnly(addMonthsUtc(thisMonth, -m));
      await agent.post('/api/transactions').send({ type: 'income', amount: 60000, category: 'Salary', description: 'Salary', date });
      await agent.post('/api/transactions').send({ type: 'expense', amount: 6000 + m * 1000, category: 'Food & Dining', description: 'Food', date });
      await agent.post('/api/transactions').send({ type: 'expense', amount: 15000, category: 'Rent & Housing', description: 'Rent', date });
    }
  });

  it('returns the typical-month baseline', async () => {
    const res = await agent.get('/api/simulator/baseline');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ income: 60000, incomeBasis: 'recent_average', startBalance: 180000 - 3 * 15000 - (7000 + 8000 + 9000) });
    // Median of 7,000 / 8,000 / 9,000 food months.
    expect(res.body.data.categories).toEqual([
      { category: 'Rent & Housing', amount: 15000 },
      { category: 'Food & Dining', amount: 8000 },
    ]);
  });

  it('simulates combined scenarios without saving anything', async () => {
    const before = (await agent.get('/api/transactions')).body.meta.total;
    const res = await agent.post('/api/simulator/run').send({
      months: 6,
      scenarios: [
        { type: 'category_change', category: 'Food & Dining', percent: -25 },
        { type: 'one_time_purchase', amount: 60000, label: 'Laptop', month: 2, emiMonths: 6, annualInterestRate: 0 },
      ],
    });
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.hasEnoughData).toBe(true);
    expect(d.baseline).toMatchObject({ income: 60000, expense: 23000, net: 37000 });
    expect(d.simulated).toMatchObject({ expense: 21000, net: 39000 });
    expect(d.projection).toHaveLength(6);
    expect(d.projection[0].simulated.oneTime).toBe(0);
    expect(d.projection[1].simulated.oneTime).toBe(10000); // 60,000 / 6 EMIs
    expect(d.purchases[0]).toMatchObject({ installment: 10000, interest: 0 });
    expect((await agent.get('/api/transactions')).body.meta.total).toBe(before);
  });

  it('validates scenarios', async () => {
    const res = await agent.post('/api/simulator/run').send({ scenarios: [{ type: 'category_change', category: 'Food & Dining', percent: -150 }] });
    expect(res.status).toBe(422);
  });

  it('works for a user with no history (no crash, flagged)', async () => {
    const fresh = await signedInAgent();
    const res = await fresh.post('/api/simulator/run').send({ scenarios: [{ type: 'income_change', percent: 10 }] });
    expect(res.status).toBe(200);
    expect(res.body.data.hasEnoughData).toBe(false);
  });
});
