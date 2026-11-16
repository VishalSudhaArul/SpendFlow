import mongoose from 'mongoose';
import { afterAll, beforeAll } from 'vitest';
import { env } from '../../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../../src/config/db.js';

beforeAll(async () => {
  // Hard safety check: never run destructive test cleanup against the real app database.
  if (!env.MONGODB_DB_NAME.endsWith('-test')) {
    throw new Error(`Refusing to run integration tests against database "${env.MONGODB_DB_NAME}"`);
  }
  if (!env.MONGODB_URI) {
    throw new Error('Integration tests need MONGODB_URI in server/.env');
  }
  await connectDatabase();
  await mongoose.connection.dropDatabase();
  await mongoose.connection.syncIndexes();
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1 && mongoose.connection.name.endsWith('-test')) {
    await mongoose.connection.dropDatabase();
  }
  await disconnectDatabase();
});
