import { sendSuccess } from '../utils/response.js';
import { env } from '../config/env.js';
import { getDatabaseState } from '../config/db.js';

/**
 * Liveness check for uptime monitors and load balancers.
 *
 * In production it reports only whether the API and database are up. The
 * per-integration flags (useful on the developer System Status page) are left
 * out there, so the public endpoint doesn't reveal how the server is configured.
 */
export function getHealth(_req, res) {
  const database = env.MONGODB_URI ? getDatabaseState() : 'not_configured';
  const healthy = database === 'connected';
  const body = {
    status: healthy ? 'ok' : 'degraded',
    service: 'spendflow-ai-api',
    timestamp: new Date().toISOString(),
  };

  if (!env.isProduction) {
    Object.assign(body, {
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      integrations: {
        database,
        auth: env.JWT_SECRET ? 'configured' : 'not_configured',
        ai: env.GEMINI_API_KEY ? 'configured' : 'not_configured',
      },
    });
  }

  res.status(healthy || !env.isProduction ? 200 : 503);
  sendSuccess(res, body, { status: res.statusCode });
}
