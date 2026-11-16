import mongoose from 'mongoose';
import { env } from './env.js';

// Reject query filters on fields that are not in the schema.
mongoose.set('strictQuery', true);

const READY_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

let listenersAttached = false;

function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  const connection = mongoose.connection;
  let wasConnected = false;
  connection.on('connected', () => {
    wasConnected = true;
  });
  // Only report a disconnect after a successful connection, not during a failed first attempt.
  connection.on('disconnected', () => {
    if (wasConnected) console.warn('[db] MongoDB disconnected');
  });
  connection.on('reconnected', () => console.log('[db] MongoDB reconnected'));
  connection.on('error', (error) => console.error(`[db] MongoDB error: ${describeConnectionError(error)}`));
}

/**
 * Connects to MongoDB Atlas. MongoDB Atlas is the only supported database:
 * there is deliberately no in-memory or local fallback, so a misconfiguration
 * fails loudly at startup instead of silently writing data somewhere else.
 */
export async function connectDatabase({ uri = env.MONGODB_URI, dbName = env.MONGODB_DB_NAME } = {}) {
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Add your MongoDB Atlas connection string to server/.env (see server/.env.example).',
    );
  }

  attachConnectionListeners();

  try {
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 10,
      autoIndex: !env.isProduction,
    });
  } catch (error) {
    throw new Error(describeConnectionError(error), { cause: error });
  }

  return mongoose.connection;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function getDatabaseState() {
  return READY_STATES[mongoose.connection.readyState] ?? 'unknown';
}

/** Round-trip latency to the cluster in milliseconds. */
export async function pingDatabase() {
  const started = performance.now();
  await mongoose.connection.db.admin().command({ ping: 1 });
  return Math.round(performance.now() - started);
}

/**
 * Turns driver errors into actionable messages. The connection string is never
 * included, because it contains the database password.
 */
export function describeConnectionError(error) {
  const message = String(error?.message ?? error ?? '');
  const codeName = error?.codeName ?? error?.cause?.codeName;

  if (codeName === 'AtlasError' || /bad auth|authentication failed/i.test(message)) {
    return 'Authentication failed: check the database username and password in MONGODB_URI. Special characters in the password must be URL-encoded.';
  }
  if (/querySrv|ENOTFOUND|EAI_AGAIN/i.test(message)) {
    return 'Could not resolve the cluster address: check the host part of MONGODB_URI and your internet/DNS connection.';
  }
  if (/Invalid scheme|Invalid connection string|URI malformed|must start with/i.test(message)) {
    return 'MONGODB_URI is not a valid connection string. Copy it again from Atlas → Connect → Drivers.';
  }
  if (error?.name === 'MongooseServerSelectionError' || /Server selection timed out|ECONNREFUSED|ETIMEDOUT/i.test(message)) {
    return 'Could not reach the cluster: your current IP address is probably not in the Atlas Network Access list, or a firewall is blocking port 27017.';
  }
  return `Database connection failed (${error?.name ?? 'Error'}).`;
}
