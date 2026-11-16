import * as coach from '../services/ai/coachService.js';
import { pingGemini } from '../services/ai/geminiClient.js';
import { env } from '../config/env.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export async function status(req, res) {
  const result = { configured: coach.aiStatus().configured, model: env.GEMINI_MODEL };
  // Optional live check (rate-limited route). Reports only success/failure, never the key.
  if (req.query.check === 'true' && result.configured) {
    try {
      const ping = await pingGemini();
      result.reachable = ping.ok;
      result.latencyMs = ping.latencyMs;
    } catch (error) {
      result.reachable = false;
      result.error = { code: error.code ?? 'AI_UNAVAILABLE', message: error.message };
    }
  }
  sendSuccess(res, result);
}

export async function chat(req, res) {
  sendCreated(res, await coach.chat(req.user, req.body));
}

export async function conversations(req, res) {
  sendSuccess(res, { items: await coach.listConversations(req.userId) });
}

export async function conversation(req, res) {
  sendSuccess(res, { conversation: await coach.getConversation(req.userId, req.params.id) });
}

export async function removeConversation(req, res) {
  await coach.deleteConversation(req.userId, req.params.id);
  sendSuccess(res, { deleted: true });
}

export async function summary(req, res) {
  sendSuccess(res, await coach.dailySummary(req.user, req.validatedQuery));
}

export async function parseTransaction(req, res) {
  sendSuccess(res, await coach.parseTransaction(req.body));
}
