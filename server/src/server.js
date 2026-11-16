import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { createApp } from './app.js';

async function start() {
  try {
    const connection = await connectDatabase();
    console.log(`[db] Connected to MongoDB Atlas (database: ${connection.name})`);
  } catch (error) {
    console.error(`[db] ${error.message}`);
    console.error('[server] Not starting without a database. Run "npm run db:check" after fixing server/.env.');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`[server] SpendFlow AI API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  async function shutdown(signal) {
    console.log(`[server] ${signal} received, shutting down`);
    // Force-exit if open connections keep the process alive.
    setTimeout(() => process.exit(1), 10_000).unref();
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
