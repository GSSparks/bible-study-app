import { describe, it, expect, beforeAll } from 'vitest';
import { getApp, createAuthAgent, bootstrapTestAdmin } from './helpers.js';

describe('Reading plans routes', () => {
  let app;

  beforeAll(async () => {
    app = await getApp();
  });

  it('GET /api/reading-plans returns an array', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent.get('/api/reading-plans');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/reading-plans is accessible without login (public endpoint)', async () => {
    const adminAgent = createAuthAgent(app);
    await bootstrapTestAdmin(adminAgent);
    const anonAgent = createAuthAgent(app);
    const res = await anonAgent.get('/api/reading-plans');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/reading-plans (admin) creates a custom plan', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const schedule = [
      { day: 1, label: 'Day 1', passages: ['John 1'] },
      { day: 2, label: 'Day 2', passages: ['John 2'] },
    ];
    const res = await agent
      .post('/api/reading-plans')
      .send({ name: 'My Custom Plan', description: 'Test plan', schedule });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('My Custom Plan');
    expect(res.body.isBuiltIn).toBe(false);
  });

  it('POST /api/reading-plans returns 400 without name', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent.post('/api/reading-plans').send({ schedule: [] });
    expect(res.status).toBe(400);
  });

  it('POST /api/reading-plans returns 400 without schedule', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent.post('/api/reading-plans').send({ name: 'No Schedule' });
    expect(res.status).toBe(400);
  });

  it('GET /api/reading-plans/:id returns a plan', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const create = await agent
      .post('/api/reading-plans')
      .send({ name: 'Get Me Plan', schedule: [{ day: 1, label: 'Day 1', passages: ['Gen 1'] }] });
    const id = create.body.id;
    const res = await agent.get(`/api/reading-plans/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Get Me Plan');
  });

  it('POST /api/reading-plans/:id/progress marks a day complete', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const create = await agent
      .post('/api/reading-plans')
      .send({ name: 'Progress Plan', schedule: [{ day: 1, label: 'Day 1', passages: ['Gen 1'] }] });
    const id = create.body.id;
    const res = await agent.post(`/api/reading-plans/${id}/progress`).send({ dayNumber: 1 });
    expect(res.status).toBe(204);
  });

  it('GET /api/reading-plans/:id/progress returns completed days', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const create = await agent
      .post('/api/reading-plans')
      .send({
        name: 'Get Progress Plan',
        schedule: [
          { day: 1, label: 'Day 1', passages: ['Gen 1'] },
          { day: 2, label: 'Day 2', passages: ['Gen 2'] },
        ],
      });
    const id = create.body.id;
    await agent.post(`/api/reading-plans/${id}/progress`).send({ dayNumber: 1 });
    await agent.post(`/api/reading-plans/${id}/progress`).send({ dayNumber: 2 });
    const res = await agent.get(`/api/reading-plans/${id}/progress`);
    expect(res.status).toBe(200);
    expect(res.body.completedDays).toContain(1);
    expect(res.body.completedDays).toContain(2);
  });

  it('DELETE /api/reading-plans/:id/progress/:dayNumber unmarks a day', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const create = await agent
      .post('/api/reading-plans')
      .send({ name: 'Unmark Plan', schedule: [{ day: 1, label: 'Day 1', passages: ['Gen 1'] }] });
    const id = create.body.id;
    await agent.post(`/api/reading-plans/${id}/progress`).send({ dayNumber: 1 });
    const del = await agent.delete(`/api/reading-plans/${id}/progress/1`);
    expect(del.status).toBe(204);
    const progress = await agent.get(`/api/reading-plans/${id}/progress`);
    expect(progress.body.completedDays).not.toContain(1);
  });

  it('DELETE /api/reading-plans/:id/progress resets all progress', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const create = await agent
      .post('/api/reading-plans')
      .send({
        name: 'Reset Plan',
        schedule: [
          { day: 1, label: 'Day 1', passages: ['Gen 1'] },
          { day: 2, label: 'Day 2', passages: ['Gen 2'] },
        ],
      });
    const id = create.body.id;
    await agent.post(`/api/reading-plans/${id}/progress`).send({ dayNumber: 1 });
    await agent.post(`/api/reading-plans/${id}/progress`).send({ dayNumber: 2 });
    const del = await agent.delete(`/api/reading-plans/${id}/progress`);
    expect(del.status).toBe(204);
    const progress = await agent.get(`/api/reading-plans/${id}/progress`);
    expect(progress.body.completedDays).toHaveLength(0);
  });

  it('DELETE /api/reading-plans/:id deletes a custom plan (admin only)', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const create = await agent
      .post('/api/reading-plans')
      .send({ name: 'Delete Me Plan', schedule: [{ day: 1, label: 'Day 1', passages: ['Gen 1'] }] });
    const id = create.body.id;
    const del = await agent.delete(`/api/reading-plans/${id}`);
    expect(del.status).toBe(204);
  });
});
