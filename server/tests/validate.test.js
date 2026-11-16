import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { describe, it, expect } from 'vitest';
import { validate } from '../src/middleware/validate.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post(
    '/items',
    validate({
      body: z.object({ name: z.string().min(2), amount: z.coerce.number().positive() }),
      query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
    }),
    (req, res) => res.json({ body: req.body, query: req.validatedQuery }),
  );
  app.use(errorHandler);
  return app;
}

describe('validate middleware', () => {
  it('passes parsed and coerced values through', async () => {
    const res = await request(buildApp()).post('/items?page=2').send({ name: 'Rent', amount: '1500', extra: 'x' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ body: { name: 'Rent', amount: 1500 }, query: { page: 2 } });
  });

  it('returns 422 with field-level details', async () => {
    const res = await request(buildApp()).post('/items').send({ name: 'R', amount: -5 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const paths = res.body.error.details.map((d) => d.path).sort();
    expect(paths).toEqual(['amount', 'name']);
  });
});
