/**
 * Model failover and circuit breaker, with the Google SDK mocked.
 * Uses plain functions (not vi.fn) — see the note in aiCoach.test.js.
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';

const behaviour = {}; // model -> async () => response
const calls = [];

vi.mock('@google/genai', () => ({
  ThinkingLevel: { LOW: 'LOW' },
  GoogleGenAI: class {
    constructor() {
      this.models = {
        generateContent: async ({ model }) => {
          calls.push(model);
          return behaviour[model]();
        },
      };
    }
  },
}));

process.env.GEMINI_API_KEY = 'test-key-not-real';
const { generateJsonWithModel, _resetCooldowns, modelOrder } = await import('../src/services/ai/geminiClient.js');

const ok = (text) => async () => ({ text });
const fail = (status, message) => async () => {
  const error = new Error(message);
  error.status = status;
  throw error;
};
const request = { system: 's', contents: [{ role: 'user', text: 'hi' }], schema: {}, timeoutMs: 1000 };

describe('Gemini model failover', () => {
  beforeEach(() => {
    _resetCooldowns();
    calls.length = 0;
  });

  it('uses the primary model when it works', async () => {
    behaviour['gemini-3.8-flash'] = ok('{"ok":true}');
    const result = await generateJsonWithModel(request);
    expect(result).toEqual({ data: { ok: true }, model: 'gemini-3.8-flash' });
    expect(calls).toEqual(['gemini-3.8-flash']);
  });

  it('fails over when the primary is overloaded, then skips it while cooling down', async () => {
    behaviour['gemini-3.8-flash'] = fail(503, 'This model is currently experiencing high demand.');
    behaviour['gemini-3.5-flash-lite'] = ok('{"ok":true}');

    const first = await generateJsonWithModel(request);
    expect(first.model).toBe('gemini-3.5-flash-lite');
    expect(calls).toEqual(['gemini-3.8-flash', 'gemini-3.5-flash-lite']);

    calls.length = 0;
    await generateJsonWithModel(request);
    expect(calls).toEqual(['gemini-3.5-flash-lite']); // primary skipped
    expect(modelOrder()).toEqual(['gemini-3.5-flash-lite']);
  });

  it('fails over on malformed output too', async () => {
    behaviour['gemini-3.8-flash'] = ok('not json');
    behaviour['gemini-3.5-flash-lite'] = ok('{"ok":true}');
    expect((await generateJsonWithModel(request)).model).toBe('gemini-3.5-flash-lite');
  });

  it('does not retry another model when the key itself is invalid', async () => {
    behaviour['gemini-3.8-flash'] = fail(400, 'API key not valid. Please pass a valid API key.');
    await expect(generateJsonWithModel(request)).rejects.toMatchObject({ code: 'AI_KEY_INVALID' });
    expect(calls).toEqual(['gemini-3.8-flash']);
  });

  it('reports the last error when every model fails', async () => {
    behaviour['gemini-3.8-flash'] = fail(503, 'busy');
    behaviour['gemini-3.5-flash-lite'] = fail(429, 'quota');
    await expect(generateJsonWithModel(request)).rejects.toMatchObject({ code: 'AI_RATE_LIMITED' });
  });
});
