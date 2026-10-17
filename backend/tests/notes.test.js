import { describe, it, expect, beforeAll } from 'vitest';
import { getApp, createAuthAgent, bootstrapTestAdmin } from './helpers.js';

describe('Notes routes', () => {
  let app;
  let agent;

  beforeAll(async () => {
    app = await getApp();
  });

  // Each test gets a fresh agent after cleanDb runs in afterEach,
  // so we re-bootstrap and login inside tests that need auth, OR
  // use a shared beforeEach block per describe. Here we use beforeAll
  // inside each describe block to keep things self-contained.

  describe('Unauthenticated access', () => {
    it('POST /api/notes without auth returns 401', async () => {
      // Bootstrap so blockUntilBootstrapped passes
      const adminAgent = createAuthAgent(app);
      await bootstrapTestAdmin(adminAgent);
      const anonAgent = createAuthAgent(app);
      const res = await anonAgent.post('/api/notes').send({ body: 'test' });
      expect(res.status).toBe(401);
    });
  });

  describe('Authenticated CRUD', () => {
    let noteId;

    it('POST /api/notes creates a note', async () => {
      agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const res = await agent
        .post('/api/notes')
        .send({ title: 'My Note', reference: 'John 3:16', body: 'God so loved the world' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ title: 'My Note', reference: 'John 3:16', body: 'God so loved the world' });
      noteId = res.body.id;
    });

    it('GET /api/notes returns all notes for user', async () => {
      agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      await agent.post('/api/notes').send({ body: 'First note' });
      await agent.post('/api/notes').send({ body: 'Second note' });
      const res = await agent.get('/api/notes');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('GET /api/notes?reference= filters by reference', async () => {
      agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      await agent.post('/api/notes').send({ reference: 'John 3:16', body: 'love' });
      await agent.post('/api/notes').send({ reference: 'Romans 8:1', body: 'condemnation' });
      const res = await agent.get('/api/notes?reference=John 3:16');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].reference).toBe('John 3:16');
    });

    it('PUT /api/notes/:id updates body', async () => {
      agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const create = await agent.post('/api/notes').send({ body: 'original body' });
      const id = create.body.id;
      const res = await agent.put(`/api/notes/${id}`).send({ body: 'updated body' });
      expect(res.status).toBe(200);
      expect(res.body.body).toBe('updated body');
    });

    it('DELETE /api/notes/:id deletes the note', async () => {
      agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const create = await agent.post('/api/notes').send({ body: 'to be deleted' });
      const id = create.body.id;
      const del = await agent.delete(`/api/notes/${id}`);
      expect(del.status).toBe(204);
      const get = await agent.get(`/api/notes/${id}`);
      expect(get.status).toBe(404);
    });

    it('GET /api/notes/:id returns 404 for non-existent note', async () => {
      agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const res = await agent.get('/api/notes/nonexistentid123');
      expect(res.status).toBe(404);
    });

    it('POST /api/notes returns 400 when body is missing (non-highlight)', async () => {
      agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const res = await agent.post('/api/notes').send({ title: 'No body here' });
      expect(res.status).toBe(400);
    });
  });
});
