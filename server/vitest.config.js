import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    env: {
      NODE_ENV: 'test',
      CLIENT_URL: 'http://localhost:5173',
      // Tests must never touch the developer's real Atlas cluster or API keys from server/.env.
      // (dotenv never overrides variables that are already set.)
      MONGODB_URI: '',
      JWT_SECRET: '',
      GEMINI_API_KEY: '',
    },
  },
});
