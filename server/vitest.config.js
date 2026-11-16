import { defineConfig } from 'vitest/config';

// Unit tests: no network, no database, no real secrets.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['tests/integration/**'],
    env: {
      NODE_ENV: 'test',
      CLIENT_URL: 'http://localhost:5173',
      // Tests must never touch the developer's real Atlas cluster or API keys from server/.env.
      // (dotenv never overrides variables that are already set.)
      MONGODB_URI: '',
      JWT_SECRET: 'unit-test-secret-not-used-anywhere-else-0123456789',
      GEMINI_API_KEY: '',
    },
  },
});
