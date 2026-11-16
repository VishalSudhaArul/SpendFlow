import { beforeAll, describe, it, expect } from 'vitest';
import { createApp } from '../../src/app.js';
import { browserAgent, uniqueEmail } from '../helpers.js';

const app = createApp();

async function signedInAgent(name = 'Owner') {
  const agent = browserAgent(app);
  const res = await agent.post('/api/auth/register').send({ name, email: uniqueEmail(), password: 'Sp3ndFlow!pass' });
  expect(res.status).toBe(201);
  return agent;
}

const expense = (overrides = {}) => ({
  type: 'expense',
  amount: 450,
  category: 'Food & Dining',
  description: 'Dinner',
  paymentMethod: 'UPI',
  date: '2026-11-15',
  ...overrides,
});

describe('transactions CRUD', () => {
  it('creates, reads, updates and deletes a transaction', async () => {
    const agent = await signedInAgent();

    const created = await agent.post('/api/transactions').send(expense({ notes: 'Team dinner' }));
    expect(created.status).toBe(201);
    const tx = created.body.data.transaction;
    expect(tx).toMatchObject({ amount: 450, category: 'Food & Dining', origin: 'manual' });
    expect(tx.date).toBe('2026-11-15T00:00:00.000Z');
    expect(tx).not.toHaveProperty('userId');

    const fetched = await agent.get(`/api/transactions/${tx.id}`);
    expect(fetched.body.data.transaction.notes).toBe('Team dinner');

    const updated = await agent.patch(`/api/transactions/${tx.id}`).send({ amount: 520.5, date: '2026-11-14' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.transaction).toMatchObject({ amount: 520.5, date: '2026-11-14T00:00:00.000Z' });

    const badCategory = await agent.patch(`/api/transactions/${tx.id}`).send({ type: 'income' });
    expect(badCategory.status).toBe(422);

    const deleted = await agent.delete(`/api/transactions/${tx.id}`);
    expect(deleted.status).toBe(200);
    expect((await agent.get(`/api/transactions/${tx.id}`)).status).toBe(404);
  });

  it('validates input', async () => {
    const agent = await signedInAgent();
    const res = await agent.post('/api/transactions').send({ type: 'expense', amount: -5, category: 'Salary', date: '2026-13-01' });
    expect(res.status).toBe(422);
    const paths = new Set(res.body.error.details.map((d) => d.path));
    expect(paths).toEqual(new Set(['amount', 'description', 'date']));
  });
});

describe('data isolation between users', () => {
  it("never exposes or modifies another user's transactions", async () => {
    const alice = await signedInAgent('Alice');
    const bob = await signedInAgent('Bob');

    const res = await alice.post('/api/transactions').send(expense({ description: 'Alice private' }));
    const id = res.body.data.transaction.id;

    expect((await bob.get(`/api/transactions/${id}`)).status).toBe(404);
    expect((await bob.patch(`/api/transactions/${id}`).send({ amount: 1 })).status).toBe(404);
    expect((await bob.delete(`/api/transactions/${id}`)).status).toBe(404);

    const bobList = await bob.get('/api/transactions');
    expect(bobList.body.data.items).toHaveLength(0);
    expect(bobList.body.data.totals.expense).toBe(0);

    const bobExport = await bob.get('/api/transactions/export');
    expect(bobExport.text).not.toContain('Alice private');

    const stillThere = await alice.get(`/api/transactions/${id}`);
    expect(stillThere.body.data.transaction.amount).toBe(450);
  });

  it('requires a session', async () => {
    expect((await browserAgent(app).get('/api/transactions')).status).toBe(401);
  });
});

describe('listing, filtering and export', () => {
  let agent;

  beforeAll(async () => {
    agent = await signedInAgent();
    const rows = [
      expense({ description: 'Swiggy order', amount: 320, date: '2026-10-02' }),
      expense({ description: 'Metro card', category: 'Transport', amount: 500, date: '2026-10-10', paymentMethod: 'Debit Card' }),
      expense({ description: 'Groceries BigBasket', category: 'Groceries', amount: 2100.75, date: '2026-11-01' }),
      expense({ description: '=cmd|calc', category: 'Shopping', amount: 999, date: '2026-11-05', paymentMethod: 'Credit Card' }),
      { type: 'income', amount: 85000, category: 'Salary', description: 'November salary', date: '2026-11-01', paymentMethod: 'Bank Transfer' },
    ];
    for (const row of rows) {
      const res = await agent.post('/api/transactions').send(row);
      expect(res.status).toBe(201);
    }
  });

  it('paginates newest first with totals for the whole filtered set', async () => {
    const res = await agent.get('/api/transactions?limit=2');
    expect(res.body.meta).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
    expect(res.body.data.items.map((t) => t.description)).toEqual(['=cmd|calc', 'November salary']); // same-day ties: newest created first
    expect(res.body.data.totals).toEqual({ income: 85000, expense: 3919.75, net: 81080.25, count: 5 });
  });

  it('filters by type, category, payment method, dates, amount and search', async () => {
    const byCategory = await agent.get('/api/transactions?category=Transport,Groceries');
    expect(byCategory.body.data.items).toHaveLength(2);

    const byDate = await agent.get('/api/transactions?type=expense&from=2026-11-01&to=2026-11-30');
    expect(byDate.body.data.totals.expense).toBe(3099.75);

    const byAmount = await agent.get('/api/transactions?minAmount=400&maxAmount=1000');
    expect(byAmount.body.data.items.map((t) => t.amount).sort()).toEqual([500, 999]);

    const bySearch = await agent.get('/api/transactions?search=swiggy');
    expect(bySearch.body.data.items).toHaveLength(1);

    const byMethod = await agent.get('/api/transactions?paymentMethod=Credit Card');
    expect(byMethod.body.data.items).toHaveLength(1);

    const sorted = await agent.get('/api/transactions?sort=amount_asc&type=expense');
    expect(sorted.body.data.items[0].amount).toBe(320);
  });

  it('exports filtered CSV with formula injection neutralized', async () => {
    const res = await agent.get('/api/transactions/export?type=expense');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="spendflow-transactions-/);

    expect(res.text.charCodeAt(0)).toBe(0xfeff);
    const lines = res.text.slice(1).trim().split('\r\n');
    expect(lines[0]).toBe('Date,Type,Description,Category,Payment method,Amount,Signed amount,Income source,Notes');
    expect(lines).toHaveLength(5);
    expect(res.text).toContain(`'=cmd|calc`);
    expect(res.text).not.toContain('November salary');
    expect(res.text).toContain(',-2100.75,');
  });
});
