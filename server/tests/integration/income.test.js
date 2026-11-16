import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app.js';
import { browserAgent, uniqueEmail } from '../helpers.js';
import { addMonthsUtc, monthKey, startOfMonthUtc, toDateOnly, todayUtc } from '../../src/utils/dates.js';

const app = createApp();

async function signedInAgent() {
  const agent = browserAgent(app);
  await agent.post('/api/auth/register').send({ name: 'Earner', email: uniqueEmail(), password: 'Sp3ndFlow!pass' });
  return agent;
}

describe('income sources', () => {
  it('records received income as linked transactions and advances the schedule', async () => {
    const agent = await signedInAgent();
    const thisMonth = startOfMonthUtc(todayUtc());
    const firstOfMonth = toDateOnly(thisMonth);

    const created = await agent.post('/api/income/sources').send({
      name: 'Acme Corp salary',
      type: 'salary',
      expectedAmount: 85000,
      frequency: 'monthly',
      nextExpectedDate: firstOfMonth,
    });
    expect(created.status).toBe(201);
    const source = created.body.data.source;

    const received = await agent.post(`/api/income/sources/${source.id}/receive`).send({ date: firstOfMonth });
    expect(received.status).toBe(201);
    expect(received.body.data.transaction).toMatchObject({
      type: 'income',
      amount: 85000,
      category: 'Salary',
      description: 'Acme Corp salary',
      incomeSourceId: source.id,
      origin: 'income_source',
    });
    expect(received.body.data.source.nextExpectedDate).toBe(`${toDateOnly(addMonthsUtc(thisMonth, 1))}T00:00:00.000Z`);

    const list = await agent.get('/api/income/sources');
    expect(list.body.data.items[0]).toMatchObject({ monthlyEquivalent: 85000, receivedThisMonth: 85000 });

    const history = await agent.get(`/api/transactions?incomeSourceId=${source.id}`);
    expect(history.body.data.items).toHaveLength(1);
  });

  it('summarizes income per month and by source', async () => {
    const agent = await signedInAgent();
    const thisMonth = startOfMonthUtc(todayUtc());
    const lastMonth = addMonthsUtc(thisMonth, -1);

    const { body } = await agent
      .post('/api/income/sources')
      .send({ name: 'Freelance', type: 'freelance', expectedAmount: 0, frequency: 'irregular' });
    const id = body.data.source.id;
    await agent.post(`/api/income/sources/${id}/receive`).send({ amount: 12000, date: toDateOnly(lastMonth) });
    await agent.post(`/api/income/sources/${id}/receive`).send({ amount: 8000, date: toDateOnly(thisMonth) });
    await agent.post('/api/transactions').send({
      type: 'income',
      amount: 500,
      category: 'Refund',
      description: 'Refund',
      date: toDateOnly(thisMonth),
    });

    const summary = await agent.get('/api/income/summary?months=3');
    const months = summary.body.data.months;
    expect(months).toHaveLength(3);
    expect(months.at(-1)).toEqual({ month: monthKey(thisMonth), total: 8500, bySource: { Freelance: 8000, 'Other income': 500 } });
    expect(months.at(-2).total).toBe(12000);
    expect(summary.body.data.averageMonthly).toBe(12000);
  });

  it('requires an amount when the source has no expected amount', async () => {
    const agent = await signedInAgent();
    const { body } = await agent.post('/api/income/sources').send({ name: 'Gigs', type: 'freelance', frequency: 'irregular' });
    const res = await agent.post(`/api/income/sources/${body.data.source.id}/receive`).send({});
    expect(res.status).toBe(422);
  });

  it('deleting a source keeps its income history', async () => {
    const agent = await signedInAgent();
    const { body } = await agent.post('/api/income/sources').send({ name: 'Rent', type: 'rental', expectedAmount: 15000 });
    const id = body.data.source.id;
    await agent.post(`/api/income/sources/${id}/receive`).send({});

    expect((await agent.delete(`/api/income/sources/${id}`)).status).toBe(200);
    const list = await agent.get('/api/transactions?type=income');
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].incomeSourceId).toBeNull();
  });

  it("cannot touch another user's sources or link to them", async () => {
    const owner = await signedInAgent();
    const intruder = await signedInAgent();
    const { body } = await owner.post('/api/income/sources').send({ name: 'Private', type: 'salary', expectedAmount: 1000 });
    const id = body.data.source.id;

    expect((await intruder.post(`/api/income/sources/${id}/receive`).send({})).status).toBe(404);
    expect((await intruder.patch(`/api/income/sources/${id}`).send({ name: 'Hacked' })).status).toBe(404);
    expect((await intruder.delete(`/api/income/sources/${id}`)).status).toBe(404);

    const linked = await intruder.post('/api/transactions').send({
      type: 'income',
      amount: 10,
      category: 'Salary',
      description: 'x',
      date: '2026-11-01',
      incomeSourceId: id,
    });
    expect(linked.status).toBe(422);
  });
});
