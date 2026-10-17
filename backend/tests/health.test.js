import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { getApp } from './helpers.js';

describe('GET /api/health', () => {
  let app;

  beforeAll(async () => {
    app = await getApp();
  });

  it('returns { status: "ok" }', async () => {
    const res = await supertest(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
