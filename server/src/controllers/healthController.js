import { sendSuccess } from '../utils/response.js';
import { env } from '../config/env.js';
import { getDatabaseState } from '../config/db.js';

/**
 * Liveness + configuration check. Reports only whether integrations are
 * configured/connected — never their values.
 */
export function getHealth(_req, res) {
  const database = env.MONGODB_URI ? getDatabaseState() : 'not_configured';
  const healthy = database === 'connected';

  sendSuccess(res, {
    status: healthy ? 'ok' : 'degraded',
    service: 'spendflow-ai-api',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    integrations: {
      database,
      auth: env.JWT_SECRET ? 'configured' : 'not_configured',
      ai: env.GEMINI_API_KEY ? 'configured' : 'not_configured',
    },
  });
}
