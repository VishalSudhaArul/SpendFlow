import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { csrfGuard } from './middleware/csrf.js';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { apiLimiter } from './middleware/rateLimiters.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { ApiError } from './utils/ApiError.js';

/**
 * Builds the Express app without starting a server or a DB connection,
 * so tests can exercise it directly with supertest.
 */
export function createApp() {
  const app = express();

  // Behind a hosting proxy (Render/Railway) the client IP comes from X-Forwarded-For,
  // which the rate limiter needs.
  if (env.isProduction) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Requests without an Origin header (curl, server-to-server, same-origin) are allowed;
        // browser requests must come from a configured CLIENT_URL.
        if (!origin || env.CLIENT_URL.includes(origin)) return callback(null, true);
        return callback(ApiError.forbidden('Origin not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-Requested-With'],
      exposedHeaders: ['Content-Disposition'],
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  if (!env.isTest) {
    // Logs method, path, status and timing only. No bodies, no auth headers.
    app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  }

  app.use('/api', apiLimiter, csrfGuard, apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
