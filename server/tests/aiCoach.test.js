/**
 * Coach service with Gemini mocked: verifies validation of AI output and the
 * fallback paths without network access or a real key.
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';

// A plain swappable function (not vi.fn): Vitest 5 reports errors thrown by
// vi.fn mocks as test failures even when the code under test catches them.
let impl = async () => ({});
const calls = [];
const generateJson = {
  mockResolvedValue: (value) => (impl = async () => value),
  mockImplementation: (fn) => (impl = fn),
  mockClear: () => (calls.length = 0),
  mock: { calls },
};

vi.mock('../src/services/ai/geminiClient.js', async () => {
  const actual = await vi.importActual('../src/services/ai/geminiClient.js');
  return { ...actual, generateJson: (...args) => {
      calls.push(args);
      return impl(...args);
    }, isAIConfigured: () => true };
});

const { parseTransaction } = await import('../src/services/ai/coachService.js');
const { AIUnavailableError } = await import('../src/services/ai/geminiClient.js');

const TODAY = '2026-11-16';

describe('parseTransaction with a mocked Gemini', () => {
  // mockClear (not mockReset): every test installs its own implementation.
  beforeEach(() => generateJson.mockClear());

  it('returns a validated AI draft and never sends personal data in the prompt', async () => {
    generateJson.mockResolvedValue({
      type: 'expense',
      amount: 450,
      category: 'Food & Dining',
      description: 'Dinner',
      paymentMethod: 'UPI',
      date: '2026-11-15',
      confidence: 0.93,
      assumptions: [],
    });
    const result = await parseTransaction({ text: 'I spent ₹450 on dinner using UPI yesterday.', today: TODAY });
    expect(result).toMatchObject({ source: 'ai', draft: { amount: 450, date: '2026-11-15', missing: [] } });

    const call = generateJson.mock.calls[0][0];
    expect(call.system).toContain('TODAY is 2026-11-16');
    expect(call.contents).toEqual([{ role: 'user', text: 'I spent ₹450 on dinner using UPI yesterday.' }]);
  });

  it('repairs a category that does not match the type and clamps future dates', async () => {
    generateJson.mockResolvedValue({
      type: 'income',
      amount: 500,
      category: 'Groceries',
      description: 'Refund',
      paymentMethod: 'UPI',
      date: '2026-12-01',
      confidence: 0.5,
      assumptions: [],
    });
    const { draft } = await parseTransaction({ text: 'got 500 back', today: TODAY });
    expect(draft).toMatchObject({ category: 'Other', date: TODAY });
    expect(draft.assumptions.length).toBe(2);
  });

  it('falls back to the rule-based parser on invalid AI output', async () => {
    generateJson.mockResolvedValue({ type: 'expense', amount: 'lots', category: 'Snacks' });
    const result = await parseTransaction({ text: 'Uber 230 by credit card', today: TODAY });
    expect(result).toMatchObject({ source: 'fallback', draft: { amount: 230, category: 'Transport', paymentMethod: 'Credit Card' } });
  });

  it('falls back when Gemini is unavailable', async () => {
    generateJson.mockImplementation(async () => {
      throw new AIUnavailableError('AI_RATE_LIMITED', 'busy');
    });
    const result = await parseTransaction({ text: 'Spent 450 on dinner', today: TODAY });
    expect(result.source).toBe('fallback');
    expect(result.draft.amount).toBe(450);
  });
});
