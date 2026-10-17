import { describe, it, expect, beforeAll } from 'vitest';
import { getApp, createAuthAgent, bootstrapTestAdmin } from './helpers.js';

describe('Bible maps routes', () => {
  let app;

  beforeAll(async () => {
    app = await getApp();
  });

  it('GET /api/bible-maps/all returns an array (may be empty if no map data)', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent.get('/api/bible-maps/all');
    // Should not crash — either 200 with an empty array (no submodule data)
    // or 200 with real data if the map submodule is present.
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/bible-maps/for-reference returns an array for a valid reference', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent.get('/api/bible-maps/for-reference?ref=John 3');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/bible-maps/for-reference returns 400 when ref is missing', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent.get('/api/bible-maps/for-reference');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('POST /api/bible-maps/reindex returns ok', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent.post('/api/bible-maps/reindex');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
