import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../../src/app.js';
import { browserAgent, uniqueEmail } from '../helpers.js';
import { addDaysUtc, addMonthsUtc, toDateOnly, todayUtc } from '../../src/utils/dates.js';
import { _resetSyncCache } from '../../src/services/notificationService.js';

const app = createApp();
const today = todayUtc();
const day = (offset) => toDateOnly(addDaysUtc(today, offset));

async function signedInAgent() {
  const agent = browserAgent(app);
  await agent.post('/api/auth/register').send({ name: 'Bill Payer', email: uniqueEmail(), password: 'Sp3ndFlow!pass' });
  return agent;
}

beforeEach(() => _resetSyncCache());

describe('subscriptions and bills', () => {
  it('generates upcoming bills, pays one as an expense, and advances the schedule', async () => {
    const agent = await signedInAgent();
    const created = await agent.post('/api/subscriptions').send({ name: 'Netflix', amount: 649, billingCycle: 'monthly', nextDueDate: day(3) });
    expect(created.status).toBe(201);
    const subId = created.body.data.subscription.id;

    const bills = (await agent.get('/api/bills')).body.data.items;
    expect(bills.length).toBeGreaterThanOrEqual(2); // ~2 months generated ahead
    expect(bills[0]).toMatchObject({ name: 'Netflix', amount: 649, state: 'due_soon', daysUntilDue: 3, subscriptionId: subId });

    // Generation is idempotent.
    expect((await agent.get('/api/bills')).body.data.items).toHaveLength(bills.length);

    const paid = await agent.post(`/api/bills/${bills[0].id}/pay`).send({});
    expect(paid.status).toBe(200);
    expect(paid.body.data.bill).toMatchObject({ status: 'paid', state: 'paid', paidAmount: 649 });
    expect(paid.body.data.transaction).toMatchObject({ type: 'expense', amount: 649, category: 'Subscriptions', origin: 'bill' });

    const subs = (await agent.get('/api/subscriptions')).body.data.items;
    expect(subs[0]).toMatchObject({ totalPaid: 649, payments: 1, monthlyCost: 649, yearlyCost: 7788 });
    expect(subs[0].nextDueDate.slice(0, 10)).toBe(toDateOnly(addMonthsUtc(addDaysUtc(today, 3), 1)));

    // Paying twice is refused; undo removes the expense and re-opens the bill.
    expect((await agent.post(`/api/bills/${bills[0].id}/pay`).send({})).status).toBe(400);
    const reopened = await agent.post(`/api/bills/${bills[0].id}/reopen`);
    expect(reopened.body.data.bill.status).toBe('upcoming');
    expect((await agent.get('/api/transactions?type=expense')).body.data.items).toHaveLength(0);
  });

  it('records variable bills at the actual amount paid', async () => {
    const agent = await signedInAgent();
    await agent.post('/api/subscriptions').send({ name: 'Electricity', kind: 'bill', amount: 1800, variableAmount: true, category: 'Bills & Utilities', nextDueDate: day(1) });
    const bill = (await agent.get('/api/bills?status=unpaid')).body.data.items[0];
    expect(bill.estimated).toBe(true);
    const res = await agent.post(`/api/bills/${bill.id}/pay`).send({ amount: 2140.5, paymentMethod: 'Debit Card' });
    expect(res.body.data.transaction).toMatchObject({ amount: 2140.5, paymentMethod: 'Debit Card' });
  });

  it('pausing and cancelling stop future bills but keep paid history', async () => {
    const agent = await signedInAgent();
    const { body } = await agent.post('/api/subscriptions').send({ name: 'Gym', amount: 1500, category: 'Health & Fitness', nextDueDate: day(0) });
    const id = body.data.subscription.id;
    const first = (await agent.get('/api/bills')).body.data.items[0];
    await agent.post(`/api/bills/${first.id}/pay`).send({});

    await agent.patch(`/api/subscriptions/${id}`).send({ status: 'paused' });
    expect((await agent.get('/api/bills?status=unpaid')).body.data.items).toHaveLength(0);

    await agent.patch(`/api/subscriptions/${id}`).send({ status: 'active' });
    expect((await agent.get('/api/bills?status=unpaid')).body.data.items.length).toBeGreaterThan(0);

    const cancelled = await agent.patch(`/api/subscriptions/${id}`).send({ status: 'cancelled' });
    expect(cancelled.body.data.subscription.cancelledAt).toBeTruthy();
    expect((await agent.get('/api/bills?status=unpaid')).body.data.items).toHaveLength(0);

    const history = await agent.get(`/api/subscriptions/${id}/history`);
    expect(history.body.data).toMatchObject({ totalPaid: 1500, payments: 1 });
  });

  it('supports one-off bills, overdue state and the summary', async () => {
    const agent = await signedInAgent();
    await agent.post('/api/bills').send({ name: 'Car insurance', amount: 12500, category: 'Other', dueDate: day(-2) });
    await agent.post('/api/subscriptions').send({ name: 'Rent', kind: 'bill', amount: 20000, category: 'Rent & Housing', nextDueDate: day(10) });

    const summary = (await agent.get('/api/bills/summary')).body.data;
    expect(summary).toMatchObject({ activeCount: 1, monthlyCost: 20000, overdue: { count: 1, total: 12500 } });
    expect(summary.nextBills[0]).toMatchObject({ name: 'Car insurance', state: 'overdue' });

    const insurance = summary.nextBills[0];
    expect((await agent.delete(`/api/bills/${insurance.id}`)).status).toBe(200);

    const rentBill = (await agent.get('/api/bills?status=unpaid')).body.data.items[0];
    expect((await agent.delete(`/api/bills/${rentBill.id}`)).status).toBe(400); // skip instead
    expect((await agent.post(`/api/bills/${rentBill.id}/skip`)).body.data.bill.status).toBe('skipped');
  });

  it('feeds upcoming bills into the dashboard', async () => {
    const agent = await signedInAgent();
    await agent.post('/api/subscriptions').send({ name: 'Broadband', kind: 'bill', amount: 799, category: 'Bills & Utilities', nextDueDate: day(2) });
    const d = (await agent.get('/api/dashboard')).body.data;
    expect(d.upcomingBills.items[0]).toMatchObject({ name: 'Broadband', state: 'due_soon' });
  });

  it("isolates subscriptions and bills between users", async () => {
    const owner = await signedInAgent();
    const other = await signedInAgent();
    const { body } = await owner.post('/api/subscriptions').send({ name: 'Private', amount: 100, nextDueDate: day(1) });
    const bill = (await owner.get('/api/bills')).body.data.items[0];

    expect((await other.patch(`/api/subscriptions/${body.data.subscription.id}`).send({ amount: 1 })).status).toBe(404);
    expect((await other.post(`/api/bills/${bill.id}/pay`).send({})).status).toBe(404);
    expect((await other.get('/api/bills')).body.data.items).toHaveLength(0);
    expect((await other.get(`/api/subscriptions/${body.data.subscription.id}/history`)).status).toBe(404);
  });
});

describe('notifications', () => {
  it('creates bill and budget notifications once, and tracks read state', async () => {
    const agent = await signedInAgent();
    await agent.post('/api/subscriptions').send({ name: 'Spotify', amount: 119, nextDueDate: day(1), reminderDaysBefore: 3 });
    await agent.post('/api/bills').send({ name: 'Old bill', amount: 500, category: 'Other', dueDate: day(-3) });
    const month = toDateOnly(today).slice(0, 7);
    await agent.post('/api/budgets').send({ month, category: 'Shopping', limit: 1000 });
    await agent.post('/api/transactions').send({ type: 'expense', amount: 1500, category: 'Shopping', description: 'Shoes', date: day(0) });

    const first = (await agent.get('/api/notifications')).body.data;
    const types = first.items.map((n) => n.type).sort();
    expect(types).toEqual(['bill_due', 'bill_overdue', 'budget_over']);
    expect(first.unreadCount).toBe(3);
    expect(first.items[0]).not.toHaveProperty('dedupeKey');

    _resetSyncCache();
    const again = (await agent.get('/api/notifications')).body.data;
    expect(again.items).toHaveLength(3); // deduplicated

    const id = again.items[0].id;
    expect((await agent.patch(`/api/notifications/${id}/read`)).body.data.notification.readAt).toBeTruthy();
    expect((await agent.get('/api/notifications')).body.data.unreadCount).toBe(2);
    await agent.post('/api/notifications/read-all');
    expect((await agent.get('/api/notifications?unreadOnly=true')).body.data.items).toHaveLength(0);

    const stranger = await signedInAgent();
    expect((await stranger.patch(`/api/notifications/${id}/read`)).status).toBe(404);
  });

  it('removes bill and budget alerts once they are resolved', async () => {
    const agent = await signedInAgent();
    const { body } = await agent.post('/api/bills').send({ name: 'Late bill', amount: 400, category: 'Other', dueDate: day(-1) });
    const month = toDateOnly(today).slice(0, 7);
    const budget = (await agent.post('/api/budgets').send({ month, category: 'Travel', limit: 500 })).body.data.budget;
    await agent.post('/api/transactions').send({ type: 'expense', amount: 800, category: 'Travel', description: 'Cab', date: day(0) });

    let types = (await agent.get('/api/notifications')).body.data.items.map((n) => n.type).sort();
    expect(types).toEqual(['bill_overdue', 'budget_over']);

    await agent.post(`/api/bills/${body.data.bill.id}/pay`).send({}); // cleared immediately
    await agent.patch(`/api/budgets/${budget.id}`).send({ limit: 5000 }); // cleared on next sync
    _resetSyncCache();
    types = (await agent.get('/api/notifications')).body.data.items.map((n) => n.type);
    expect(types).toEqual([]);
  });

  it('notifies when a savings goal is reached', async () => {
    const agent = await signedInAgent();
    const { body } = await agent.post('/api/goals').send({ name: 'Phone', targetAmount: 1000 });
    await agent.post(`/api/goals/${body.data.goal.id}/contributions`).send({ amount: 1000 });
    const items = (await agent.get('/api/notifications')).body.data.items;
    expect(items.some((n) => n.type === 'goal_reached' && n.title.includes('Phone'))).toBe(true);
  });
});
