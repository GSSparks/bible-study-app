import { describe, it, expect, beforeAll } from 'vitest';
import { getApp, createAuthAgent, bootstrapTestAdmin, loginAs, createTestUser } from './helpers.js';

describe('Connections routes', () => {
  let app;

  beforeAll(async () => {
    app = await getApp();
  });

  it('GET /api/connections/search?q= returns users matching query', async () => {
    const adminAgent = createAuthAgent(app);
    await bootstrapTestAdmin(adminAgent);
    await createTestUser(adminAgent, { username: 'searchable' });
    const res = await adminAgent.get('/api/connections/search?q=search');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((u) => u.username === 'searchable')).toBe(true);
  });

  it('GET /api/connections/search returns empty array for short query', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent.get('/api/connections/search?q=a');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/connections sends a connection request', async () => {
    const adminAgent = createAuthAgent(app);
    await bootstrapTestAdmin(adminAgent);
    await createTestUser(adminAgent, { username: 'recipient' });
    const res = await adminAgent.post('/api/connections').send({ username: 'recipient' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
  });

  it('POST /api/connections returns 400 without username', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent.post('/api/connections').send({});
    expect(res.status).toBe(400);
  });

  it('GET /api/connections/requests lists incoming pending requests', async () => {
    const adminAgent = createAuthAgent(app);
    await bootstrapTestAdmin(adminAgent);
    await createTestUser(adminAgent, { username: 'requestor' });

    const requestorAgent = createAuthAgent(app);
    await loginAs(requestorAgent, 'requestor', 'userpass123');
    await requestorAgent.post('/api/connections').send({ username: 'admin' });

    const res = await adminAgent.get('/api/connections/requests');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((r) => r.username === 'requestor')).toBe(true);
  });

  it('POST /api/connections/:id/accept accepts a connection request', async () => {
    const adminAgent = createAuthAgent(app);
    await bootstrapTestAdmin(adminAgent);
    await createTestUser(adminAgent, { username: 'acceptor' });

    const acceptorAgent = createAuthAgent(app);
    await loginAs(acceptorAgent, 'acceptor', 'userpass123');
    const sendRes = await acceptorAgent.post('/api/connections').send({ username: 'admin' });
    const connectionId = sendRes.body.id;

    const res = await adminAgent.post(`/api/connections/${connectionId}/accept`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
  });

  it('GET /api/connections lists accepted connections', async () => {
    const adminAgent = createAuthAgent(app);
    await bootstrapTestAdmin(adminAgent);
    await createTestUser(adminAgent, { username: 'connfriend' });

    const friendAgent = createAuthAgent(app);
    await loginAs(friendAgent, 'connfriend', 'userpass123');
    const sendRes = await friendAgent.post('/api/connections').send({ username: 'admin' });
    const connectionId = sendRes.body.id;
    await adminAgent.post(`/api/connections/${connectionId}/accept`);

    const res = await adminAgent.get('/api/connections');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((c) => c.username === 'connfriend')).toBe(true);
  });

  it('DELETE /api/connections/:id removes a connection', async () => {
    const adminAgent = createAuthAgent(app);
    await bootstrapTestAdmin(adminAgent);
    await createTestUser(adminAgent, { username: 'removefriend' });

    const friendAgent = createAuthAgent(app);
    await loginAs(friendAgent, 'removefriend', 'userpass123');
    const sendRes = await friendAgent.post('/api/connections').send({ username: 'admin' });
    const connectionId = sendRes.body.id;
    await adminAgent.post(`/api/connections/${connectionId}/accept`);

    const del = await adminAgent.delete(`/api/connections/${connectionId}`);
    expect(del.status).toBe(204);

    const list = await adminAgent.get('/api/connections');
    expect(list.body.some((c) => c.username === 'removefriend')).toBe(false);
  });

  it('POST /api/connections/:id/decline declines a connection request', async () => {
    const adminAgent = createAuthAgent(app);
    await bootstrapTestAdmin(adminAgent);
    await createTestUser(adminAgent, { username: 'decliner' });

    const declinerAgent = createAuthAgent(app);
    await loginAs(declinerAgent, 'decliner', 'userpass123');
    const sendRes = await declinerAgent.post('/api/connections').send({ username: 'admin' });
    const connectionId = sendRes.body.id;

    const res = await adminAgent.post(`/api/connections/${connectionId}/decline`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('declined');
  });
});
