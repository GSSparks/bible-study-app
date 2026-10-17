import { describe, it, expect, beforeAll } from 'vitest';
import { getApp, createAuthAgent, bootstrapTestAdmin } from './helpers.js';

describe('Highlights routes', () => {
  let app;

  beforeAll(async () => {
    app = await getApp();
  });

  it('POST /api/notes/highlights creates a highlight', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent
      .post('/api/notes/highlights')
      .send({ reference: 'John 3:16', module: 'KJV', color: 'yellow' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ reference: 'John 3:16', module: 'KJV', color: 'yellow' });
  });

  it('GET /api/notes/highlights?reference= filters by reference', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    await agent.post('/api/notes/highlights').send({ reference: 'John 3:16', module: 'KJV', color: 'yellow' });
    await agent.post('/api/notes/highlights').send({ reference: 'Romans 8:1', module: 'KJV', color: 'blue' });
    const res = await agent.get('/api/notes/highlights?reference=John 3:16');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].reference).toBe('John 3:16');
  });

  it('GET /api/notes/highlights returns all highlights for user', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    await agent.post('/api/notes/highlights').send({ reference: 'John 3:16', module: 'KJV', color: 'yellow' });
    await agent.post('/api/notes/highlights').send({ reference: 'John 3:17', module: 'KJV', color: 'green' });
    const res = await agent.get('/api/notes/highlights');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('DELETE /api/notes/highlights/:id deletes a highlight', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const create = await agent
      .post('/api/notes/highlights')
      .send({ reference: 'John 3:16', module: 'KJV', color: 'yellow' });
    const id = create.body.id;
    const del = await agent.delete(`/api/notes/highlights/${id}`);
    expect(del.status).toBe(204);
    const list = await agent.get('/api/notes/highlights?reference=John 3:16');
    expect(list.body.length).toBe(0);
  });

  it('DELETE /api/notes/highlights/:id returns 404 for non-existent id', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent.delete('/api/notes/highlights/nonexistentid');
    expect(res.status).toBe(404);
  });
});
