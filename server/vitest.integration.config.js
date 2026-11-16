import { defineConfig } from 'vitest/config';

/**
 * Integration tests run against your MongoDB Atlas cluster (MONGODB_URI from server/.env)
 * but in a separate, throwaway database that is dropped after the run.
 * Usage: npm run test:integration
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.js'],
    setupFiles: ['tests/integration/setup.js'],
    // One file at a time: they share the test database.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      CLIENT_URL: 'http://localhost:5173',
      MONGODB_DB_NAME: 'spendflow-ai-test',
      JWT_SECRET: 'integration-test-secret-not-used-anywhere-else-0123',
      GEMINI_API_KEY: '',
    },
  },
});
