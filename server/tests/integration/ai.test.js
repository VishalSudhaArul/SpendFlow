/**
 * AI endpoints against Atlas with Gemini DISABLED (no key in the integration
 * config), so these exercise the full request path plus the deterministic
 * fallbacks, conversation storage and ownership — without network AI calls.
 */
import { beforeAll, describe, it, expect } from 'vitest';
import { createApp } from '../../src/app.js';
import { browserAgent, uniqueEmail } from '../helpers.js';
import { startOfMonthUtc, toDateOnly, todayUtc } from '../../src/utils/dates.js';

const app = createApp();
const today = toDateOnly(todayUtc());

async function signedInAgent() {
  const agent = browserAgent(app);
  await agent.post('/api/auth/register').send({ name: 'Coach User', email: uniqueEmail(), password: 'Sp3ndFlow!pass' });
  return agent;
}

describe('AI coach endpoints (fallback mode)', () => {
  let agent;

  beforeAll(async () => {
    agent = await signedInAgent();
    const first = toDateOnly(startOfMonthUtc(todayUtc()));
    await agent.post('/api/transactions').send({ type: 'income', amount: 60000, category: 'Salary', description: 'Salary', date: first });
    await agent.post('/api/transactions').send({ type: 'expense', amount: 2500, category: 'Food & Dining', description: 'Dinners', date: first });
    // Seven bigger categories push Food out of the dashboard's "top 6" lists.
    const bigger = ['Rent & Housing', 'Shopping', 'Groceries', 'Transport', 'Travel', 'Education', 'Entertainment'];
    for (const [i, category] of bigger.entries()) {
      await agent.post('/api/transactions').send({ type: 'expense', amount: 5000 + i * 100, category, description: category, date: first });
    }
  });

  it('gives the coach every category, not just the top few (regression)', async () => {
    const res = await agent.post('/api/ai/chat').send({ message: 'Am I spending too much on food?' });
    expect(res.body.data.conversation.messages[1].content).toMatch(/This month so far: ₹2,500/);
  });

  it('reports AI status without exposing secrets', async () => {
    const res = await agent.get('/api/ai/status');
    expect(res.body.data).toMatchObject({ configured: false });
    expect(JSON.stringify(res.body)).not.toMatch(/AIza|apiKey/i);
  });

  it('answers in a new conversation and continues it', async () => {
    const first = await agent.post('/api/ai/chat').send({ message: 'Where did most of my money go this month?' });
    expect(first.status).toBe(201);
    const conversation = first.body.data.conversation;
    expect(first.body.data.source).toBe('fallback');
    expect(conversation.title).toBe('Where did most of my money go this month?');
    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages[1]).toMatchObject({ role: 'assistant', source: 'fallback' });
    expect(conversation.messages[1].content).toMatch(/Entertainment: ₹5,600/); // the largest category
    expect(conversation.messages[1].note).toMatch(/Gemini is not set up/);

    const second = await agent.post('/api/ai/chat').send({ message: 'Can I afford a ₹100,000 purchase?', conversationId: conversation.id });
    expect(second.body.data.conversation.messages).toHaveLength(4);

    const list = await agent.get('/api/ai/conversations');
    expect(list.body.data.items[0]).toMatchObject({ id: conversation.id });
  });

  it('parses a natural-language transaction into a draft without saving it', async () => {
    const before = (await agent.get('/api/transactions')).body.meta.total;
    const res = await agent.post('/api/ai/parse-transaction').send({ text: 'I spent ₹450 on dinner using UPI yesterday.', today });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ source: 'fallback', draft: { amount: 450, category: 'Food & Dining', paymentMethod: 'UPI' } });
    expect((await agent.get('/api/transactions')).body.meta.total).toBe(before);

    // The user confirms the preview → saved with origin "ai".
    const { draft } = res.body.data;
    const saved = await agent.post('/api/transactions').send({ ...draft, missing: undefined, confidence: undefined, assumptions: undefined, origin: 'ai' });
    expect(saved.status).toBe(201);
    expect(saved.body.data.transaction.origin).toBe('ai');
  });

  it('rejects a client date far from the server date', async () => {
    const res = await agent.post('/api/ai/parse-transaction').send({ text: 'lunch 200', today: '2020-01-01' });
    expect(res.status).toBe(422);
  });

  it('caches the daily summary', async () => {
    const first = await agent.get(`/api/ai/summary?today=${today}`);
    expect(first.body.data).toMatchObject({ source: 'fallback', cached: false });
    expect(first.body.data.headline).toMatch(/spent/);
    const second = await agent.get(`/api/ai/summary?today=${today}`);
    expect(second.body.data.cached).toBe(true);

    // New data → new fingerprint → fresh summary without a manual refresh.
    await agent.post('/api/transactions').send({ type: 'expense', amount: 300, category: 'Food & Dining', description: 'Snacks', date: today });
    const third = await agent.get(`/api/ai/summary?today=${today}`);
    expect(third.body.data.cached).toBe(false);
  });

  it("keeps conversations private to their owner", async () => {
    const { body } = await agent.post('/api/ai/chat').send({ message: 'How is my budget?' });
    const id = body.data.conversation.id;
    const stranger = await signedInAgent();
    expect((await stranger.get(`/api/ai/conversations/${id}`)).status).toBe(404);
    expect((await stranger.delete(`/api/ai/conversations/${id}`)).status).toBe(404);
    expect((await stranger.post('/api/ai/chat').send({ message: 'hi', conversationId: id })).status).toBe(404);
    expect((await stranger.get('/api/ai/conversations')).body.data.items).toEqual([]);
  });
});
