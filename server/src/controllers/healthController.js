import { sendSuccess } from '../utils/response.js';
import { env } from '../config/env.js';

/**
 * Liveness + configuration check. Reports only whether integrations are
 * configured — never their values.
 */
export function getHealth(_req, res) {
  sendSuccess(res, {
    status: 'ok',
    service: 'spendflow-ai-api',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    integrations: {
      database: env.MONGODB_URI ? 'configured' : 'not_configured',
      auth: env.JWT_SECRET ? 'configured' : 'not_configured',
      ai: env.GEMINI_API_KEY ? 'configured' : 'not_configured',
    },
  });
}
