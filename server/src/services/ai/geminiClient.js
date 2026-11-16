/**
 * Thin wrapper around the official Google GenAI SDK.
 *
 * - The API key is read only here, on the server. It is never logged, never
 *   returned by any endpoint and never sent to the browser.
 * - Prompts are never logged (they contain the user's financial summary).
 * - Every call has a timeout and returns parsed JSON validated by the caller.
 */
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { env } from '../../config/env.js';

export class AIUnavailableError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AIUnavailableError';
    this.code = code;
  }
}

let client = null;

function getClient() {
  if (!env.GEMINI_API_KEY) {
    throw new AIUnavailableError('AI_NOT_CONFIGURED', 'GEMINI_API_KEY is not set in server/.env');
  }
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

export function isAIConfigured() {
  return Boolean(env.GEMINI_API_KEY);
}

/** Maps SDK/network errors to a small set of codes without leaking details. */
export function classifyError(error) {
  if (error instanceof AIUnavailableError) return error;
  const status = error?.status;
  const message = String(error?.message ?? '');

  if (error?.name === 'AbortError' || /aborted|timed? ?out/i.test(message)) {
    return new AIUnavailableError('AI_TIMEOUT', 'The AI service took too long to respond');
  }
  if (status === 400 && /api[_ ]?key/i.test(message)) {
    return new AIUnavailableError('AI_KEY_INVALID', 'The Gemini API key was rejected. Check GEMINI_API_KEY in server/.env');
  }
  if (status === 401 || status === 403) {
    return new AIUnavailableError('AI_KEY_INVALID', 'The Gemini API key is not authorised for this model');
  }
  if (status === 404) {
    return new AIUnavailableError('AI_MODEL_NOT_FOUND', `Gemini model "${env.GEMINI_MODEL}" is not available. Set GEMINI_MODEL in server/.env`);
  }
  if (status === 429) {
    return new AIUnavailableError('AI_RATE_LIMITED', 'Gemini usage limit reached. Try again shortly');
  }
  return new AIUnavailableError('AI_UNAVAILABLE', 'The AI service is temporarily unavailable');
}

/**
 * Calls Gemini and returns the parsed JSON object.
 * `contents` is [{ role: 'user'|'model', text }].
 */
export async function generateJson({ system, contents, schema, temperature = 0.3, maxOutputTokens = 2048, timeoutMs = 25_000 }) {
  const ai = getClient();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const request = (withThinking) =>
    ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: contents.map((c) => ({ role: c.role, parts: [{ text: c.text }] })),
      config: {
        systemInstruction: system,
        temperature,
        maxOutputTokens,
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
        abortSignal: controller.signal,
        ...(withThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
      },
    });

  try {
    let response;
    try {
      response = await request(true);
    } catch (error) {
      // Some models do not accept a thinking level; retry once without it.
      if (error?.status === 400 && /thinking/i.test(String(error?.message))) response = await request(false);
      else throw error;
    }

    const text = response.text;
    if (!text) throw new AIUnavailableError('AI_EMPTY', 'The AI returned an empty response');
    try {
      return JSON.parse(text);
    } catch {
      throw new AIUnavailableError('AI_BAD_OUTPUT', 'The AI returned malformed output');
    }
  } catch (error) {
    throw classifyError(error);
  } finally {
    clearTimeout(timer);
  }
}

/** Cheap connectivity check used by the status endpoint and `npm run ai:check`. */
export async function pingGemini() {
  const started = performance.now();
  const result = await generateJson({
    system: 'You are a health check. Reply with JSON only.',
    contents: [{ role: 'user', text: 'Reply with {"ok": true}' }],
    schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
    temperature: 0,
    maxOutputTokens: 256,
    timeoutMs: 20_000,
  });
  return { ok: result?.ok === true, latencyMs: Math.round(performance.now() - started), model: env.GEMINI_MODEL };
}
