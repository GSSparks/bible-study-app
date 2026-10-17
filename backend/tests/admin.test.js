import { describe, it, expect, beforeAll } from 'vitest';
import { getApp, createAuthAgent, bootstrapTestAdmin, loginAs, createTestUser } from './helpers.js';

describe('Admin routes', () => {
  let app;

  beforeAll(async () => {
    app = await getApp();
  });

  describe('GET /api/admin/metrics', () => {
    it('returns metrics for admin user', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const res = await agent.get('/api/admin/metrics');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('dbHealth');
      expect(res.body).toHaveProperty('users');
      expect(res.body).toHaveProperty('content');
      expect(res.body.users).toHaveProperty('total');
      expect(res.body.content).toHaveProperty('notes');
    });

    it('returns 401 for unauthenticated user', async () => {
      const adminAgent = createAuthAgent(app);
      await bootstrapTestAdmin(adminAgent);
      const anonAgent = createAuthAgent(app);
      const res = await anonAgent.get('/api/admin/metrics');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin user', async () => {
      const adminAgent = createAuthAgent(app);
      await bootstrapTestAdmin(adminAgent);
      await createTestUser(adminAgent, { username: 'regularadmintest', role: 'user' });
      const userAgent = createAuthAgent(app);
      await loginAs(userAgent, 'regularadmintest', 'userpass123');
      const res = await userAgent.get('/api/admin/metrics');
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/auth/users', () => {
    it('lists all users for admin', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      await createTestUser(agent, { username: 'listed1' });
      await createTestUser(agent, { username: 'listed2' });
      const res = await agent.get('/api/auth/users');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3); // admin + 2 users
      // Ensure password hash is never returned
      for (const u of res.body) {
        expect(u.passwordHash).toBeUndefined();
      }
    });

    it('returns 403 for non-admin', async () => {
      const adminAgent = createAuthAgent(app);
      await bootstrapTestAdmin(adminAgent);
      await createTestUser(adminAgent, { username: 'nonadminauthtest' });
      const userAgent = createAuthAgent(app);
      await loginAs(userAgent, 'nonadminauthtest', 'userpass123');
      const res = await userAgent.get('/api/auth/users');
      expect(res.status).toBe(403);
    });
  });

  describe('Module visibility', () => {
    it('GET /api/admin/modules/visibility returns an array', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const res = await agent.get('/api/admin/modules/visibility?type=BIBLE');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // With the mock SWORD, no modules are installed, so this is an empty array
      expect(res.body.length).toBe(0);
    });

    it('POST /api/admin/modules/:moduleCode/visibility sets module availability', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const res = await agent
        .post('/api/admin/modules/KJV/visibility')
        .send({ availableToUsers: false });
      expect(res.status).toBe(200);
      expect(res.body.availableToUsers).toBe(false);
    });

    it('POST /api/admin/modules/:moduleCode/visibility returns 400 for non-boolean', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const res = await agent
        .post('/api/admin/modules/KJV/visibility')
        .send({ availableToUsers: 'yes' });
      expect(res.status).toBe(400);
    });

    it('returns 403 when non-admin accesses module visibility', async () => {
      const adminAgent = createAuthAgent(app);
      await bootstrapTestAdmin(adminAgent);
      await createTestUser(adminAgent, { username: 'modvistest' });
      const userAgent = createAuthAgent(app);
      await loginAs(userAgent, 'modvistest', 'userpass123');
      const res = await userAgent.get('/api/admin/modules/visibility');
      expect(res.status).toBe(403);
    });
  });
});
