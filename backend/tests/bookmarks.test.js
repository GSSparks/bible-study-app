import { describe, it, expect, beforeAll } from 'vitest';
import { getApp, createAuthAgent, bootstrapTestAdmin } from './helpers.js';

describe('Bookmarks routes', () => {
  let app;

  beforeAll(async () => {
    app = await getApp();
  });

  it('POST /api/notes/bookmarks creates a bookmark', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent
      .post('/api/notes/bookmarks')
      .send({ reference: 'John 3:16', module: 'KJV', label: 'Favorite verse' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ reference: 'John 3:16', module: 'KJV', label: 'Favorite verse' });
  });

  it('GET /api/notes/bookmarks returns all bookmarks for user', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    await agent.post('/api/notes/bookmarks').send({ reference: 'John 3:16', module: 'KJV' });
    await agent.post('/api/notes/bookmarks').send({ reference: 'Romans 8:28', module: 'KJV' });
    const res = await agent.get('/api/notes/bookmarks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  it('PUT /api/notes/bookmarks/:id updates label', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const create = await agent
      .post('/api/notes/bookmarks')
      .send({ reference: 'John 3:16', module: 'KJV', label: 'Original label' });
    const id = create.body.id;
    const res = await agent.put(`/api/notes/bookmarks/${id}`).send({ label: 'Updated label' });
    expect(res.status).toBe(200);
    expect(res.body.label).toBe('Updated label');
  });

  it('DELETE /api/notes/bookmarks/:id deletes a bookmark', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const create = await agent
      .post('/api/notes/bookmarks')
      .send({ reference: 'John 3:16', module: 'KJV' });
    const id = create.body.id;
    const del = await agent.delete(`/api/notes/bookmarks/${id}`);
    expect(del.status).toBe(204);
    const list = await agent.get('/api/notes/bookmarks');
    expect(list.body.length).toBe(0);
  });

  it('PUT /api/notes/bookmarks/:id returns 404 for non-existent id', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent.put('/api/notes/bookmarks/nonexistentid').send({ label: 'test' });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/notes/bookmarks/:id returns 404 for non-existent id', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent.delete('/api/notes/bookmarks/nonexistentid');
    expect(res.status).toBe(404);
  });

  it('GET /api/notes/bookmarks returns 401 when not logged in', async () => {
    const adminAgent = createAuthAgent(app);
    await bootstrapTestAdmin(adminAgent);
    const anonAgent = createAuthAgent(app);
    const res = await anonAgent.get('/api/notes/bookmarks');
    expect(res.status).toBe(401);
  });
});
