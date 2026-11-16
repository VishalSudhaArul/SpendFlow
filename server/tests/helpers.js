import request from 'supertest';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../src/middleware/csrf.js';

/**
 * A supertest agent that keeps cookies between requests (like a browser) and
 * sends the CSRF header the web client sends.
 */
export function browserAgent(app) {
  const agent = request.agent(app);
  const withHeader = (method) => (url) => agent[method](url).set(CSRF_HEADER, CSRF_HEADER_VALUE);
  return {
    get: (url) => agent.get(url),
    post: withHeader('post'),
    patch: withHeader('patch'),
    put: withHeader('put'),
    delete: withHeader('delete'),
  };
}

let counter = 0;
export function uniqueEmail(prefix = 'user') {
  counter += 1;
  return `${prefix}.${Date.now()}.${counter}@example.test`;
}
