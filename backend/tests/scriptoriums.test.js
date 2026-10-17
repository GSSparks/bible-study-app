import { describe, it, expect, beforeAll } from 'vitest';
import { getApp, createAuthAgent, bootstrapTestAdmin, loginAs, createTestUser } from './helpers.js';

describe('Scriptoriums routes', () => {
  let app;

  beforeAll(async () => {
    app = await getApp();
  });

  it('POST /api/scriptoriums creates a scriptorium', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent
      .post('/api/scriptoriums')
      .send({ name: 'Test Scriptorium', description: 'A test group', visibility: 'public' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Test Scriptorium', visibility: 'public' });
  });

  it('POST /api/scriptoriums returns 400 without a name', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent.post('/api/scriptoriums').send({ visibility: 'public' });
    expect(res.status).toBe(400);
  });

  it('GET /api/scriptoriums/public lists public scriptoriums', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    await agent.post('/api/scriptoriums').send({ name: 'Public Group', visibility: 'public' });
    await agent.post('/api/scriptoriums').send({ name: 'Private Group', visibility: 'private' });
    const res = await agent.get('/api/scriptoriums/public');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const names = res.body.map((s) => s.name);
    expect(names).toContain('Public Group');
    expect(names).not.toContain('Private Group');
  });

  it('GET /api/scriptoriums/:id returns the scriptorium', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const create = await agent
      .post('/api/scriptoriums')
      .send({ name: 'My Group', visibility: 'public' });
    const id = create.body.id;
    const res = await agent.get(`/api/scriptoriums/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('My Group');
  });

  it('GET /api/scriptoriums/:id/members returns member list', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const create = await agent
      .post('/api/scriptoriums')
      .send({ name: 'Member Test Group', visibility: 'public' });
    const id = create.body.id;
    const res = await agent.get(`/api/scriptoriums/${id}/members`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // The owner is always a member
    expect(res.body.length).toBe(1);
    expect(res.body[0].role).toBe('owner');
  });

  it('POST /api/scriptoriums/:id/invite invites a fellow user', async () => {
    const adminAgent = createAuthAgent(app);
    await bootstrapTestAdmin(adminAgent);
    await createTestUser(adminAgent, { username: 'invitee' });

    // Establish a Fellows connection first — inviteToScriptorium requires it
    const inviteeAgent = createAuthAgent(app);
    await loginAs(inviteeAgent, 'invitee', 'userpass123');
    const connRes = await inviteeAgent.post('/api/connections').send({ username: 'admin' });
    const connectionId = connRes.body.id;
    await adminAgent.post(`/api/connections/${connectionId}/accept`);

    const create = await adminAgent
      .post('/api/scriptoriums')
      .send({ name: 'Invite Test Group', visibility: 'private' });
    const id = create.body.id;

    const res = await adminAgent
      .post(`/api/scriptoriums/${id}/invite`)
      .send({ username: 'invitee' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
  });

  it('POST /api/scriptoriums/:id/invite returns 400 without username', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const create = await agent.post('/api/scriptoriums').send({ name: 'Test', visibility: 'private' });
    const id = create.body.id;
    const res = await agent.post(`/api/scriptoriums/${id}/invite`).send({});
    expect(res.status).toBe(400);
  });

  it('GET /api/scriptoriums/invites returns pending invites for current user', async () => {
    const adminAgent = createAuthAgent(app);
    await bootstrapTestAdmin(adminAgent);
    await createTestUser(adminAgent, { username: 'inviterecipient' });

    const inviteeAgent = createAuthAgent(app);
    await loginAs(inviteeAgent, 'inviterecipient', 'userpass123');

    // Must be fellows first
    const connRes = await inviteeAgent.post('/api/connections').send({ username: 'admin' });
    const connectionId = connRes.body.id;
    await adminAgent.post(`/api/connections/${connectionId}/accept`);

    const create = await adminAgent
      .post('/api/scriptoriums')
      .send({ name: 'Invite Group', visibility: 'private' });
    const scriptoriumId = create.body.id;
    await adminAgent.post(`/api/scriptoriums/${scriptoriumId}/invite`).send({ username: 'inviterecipient' });

    const res = await inviteeAgent.get('/api/scriptoriums/invites');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  it('POST /api/scriptoriums/invites/:inviteId/accept accepts the invite', async () => {
    const adminAgent = createAuthAgent(app);
    await bootstrapTestAdmin(adminAgent);
    await createTestUser(adminAgent, { username: 'acceptuser' });

    const inviteeAgent = createAuthAgent(app);
    await loginAs(inviteeAgent, 'acceptuser', 'userpass123');

    // Must be fellows first
    const connRes = await inviteeAgent.post('/api/connections').send({ username: 'admin' });
    const connectionId = connRes.body.id;
    await adminAgent.post(`/api/connections/${connectionId}/accept`);

    const create = await adminAgent
      .post('/api/scriptoriums')
      .send({ name: 'Accept Group', visibility: 'private' });
    const scriptoriumId = create.body.id;
    const inviteRes = await adminAgent
      .post(`/api/scriptoriums/${scriptoriumId}/invite`)
      .send({ username: 'acceptuser' });
    const inviteId = inviteRes.body.id;

    const res = await inviteeAgent.post(`/api/scriptoriums/invites/${inviteId}/accept`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');

    // Verify the user is now a member
    const members = await adminAgent.get(`/api/scriptoriums/${scriptoriumId}/members`);
    expect(members.body.length).toBe(2);
  });

  it('POST /api/scriptoriums/:id/join joins a public scriptorium', async () => {
    const adminAgent = createAuthAgent(app);
    await bootstrapTestAdmin(adminAgent);
    await createTestUser(adminAgent, { username: 'joiner' });

    const create = await adminAgent
      .post('/api/scriptoriums')
      .send({ name: 'Public Join Group', visibility: 'public' });
    const scriptoriumId = create.body.id;

    const joinerAgent = createAuthAgent(app);
    await loginAs(joinerAgent, 'joiner', 'userpass123');
    const res = await joinerAgent.post(`/api/scriptoriums/${scriptoriumId}/join`);
    expect(res.status).toBe(201);
  });

  it('POST /api/scriptoriums/:id/leave leaves a scriptorium', async () => {
    const adminAgent = createAuthAgent(app);
    await bootstrapTestAdmin(adminAgent);
    await createTestUser(adminAgent, { username: 'leaver' });

    const create = await adminAgent
      .post('/api/scriptoriums')
      .send({ name: 'Leave Group', visibility: 'public' });
    const scriptoriumId = create.body.id;

    const leaverAgent = createAuthAgent(app);
    await loginAs(leaverAgent, 'leaver', 'userpass123');
    await leaverAgent.post(`/api/scriptoriums/${scriptoriumId}/join`);
    const res = await leaverAgent.post(`/api/scriptoriums/${scriptoriumId}/leave`);
    expect(res.status).toBe(204);
  });

  it('POST /api/scriptoriums/:id/resources adds a resource', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const create = await agent.post('/api/scriptoriums').send({ name: 'Resource Group', visibility: 'public' });
    const id = create.body.id;
    const res = await agent
      .post(`/api/scriptoriums/${id}/resources`)
      .send({ type: 'link', label: 'Bible Gateway', url: 'https://biblegateway.com' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ type: 'link', label: 'Bible Gateway' });
  });

  it('GET /api/scriptoriums/:id/resources lists resources', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const create = await agent.post('/api/scriptoriums').send({ name: 'List Resources Group', visibility: 'public' });
    const id = create.body.id;
    await agent
      .post(`/api/scriptoriums/${id}/resources`)
      .send({ type: 'link', label: 'Resource 1', url: 'https://example.com' });
    const res = await agent.get(`/api/scriptoriums/${id}/resources`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it('DELETE /api/scriptoriums/:id/resources/:resourceId removes a resource', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const create = await agent.post('/api/scriptoriums').send({ name: 'Del Resource Group', visibility: 'public' });
    const id = create.body.id;
    const addRes = await agent
      .post(`/api/scriptoriums/${id}/resources`)
      .send({ type: 'link', label: 'To Remove', url: 'https://example.com' });
    const resourceId = addRes.body.id;
    const del = await agent.delete(`/api/scriptoriums/${id}/resources/${resourceId}`);
    expect(del.status).toBe(204);
  });

  it('DELETE /api/scriptoriums/:id deletes the scriptorium', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const create = await agent.post('/api/scriptoriums').send({ name: 'To Delete', visibility: 'public' });
    const id = create.body.id;
    const del = await agent.delete(`/api/scriptoriums/${id}`);
    expect(del.status).toBe(204);
  });
});
