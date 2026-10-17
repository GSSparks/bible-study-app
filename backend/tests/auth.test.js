import { describe, it, expect, beforeAll } from 'vitest';
import { getApp, createAuthAgent, bootstrapTestAdmin, loginAs, createTestUser } from './helpers.js';

describe('Auth routes', () => {
  let app;

  beforeAll(async () => {
    app = await getApp();
  });

  describe('GET /api/auth/bootstrap-status', () => {
    it('returns setupRequired: true before any user exists', async () => {
      const agent = createAuthAgent(app);
      const res = await agent.get('/api/auth/bootstrap-status');
      expect(res.status).toBe(200);
      expect(res.body.setupRequired).toBe(true);
    });
  });

  describe('POST /api/auth/bootstrap', () => {
    it('returns 400 when username is missing', async () => {
      const agent = createAuthAgent(app);
      const res = await agent.post('/api/auth/bootstrap').send({ password: 'adminpass123' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
      const agent = createAuthAgent(app);
      const res = await agent.post('/api/auth/bootstrap').send({ username: 'admin' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when password is too short', async () => {
      const agent = createAuthAgent(app);
      const res = await agent.post('/api/auth/bootstrap').send({ username: 'admin', password: 'short' });
      expect(res.status).toBe(400);
    });

    it('creates the admin account and returns user with role admin', async () => {
      const agent = createAuthAgent(app);
      const res = await agent.post('/api/auth/bootstrap').send({ username: 'admin', password: 'adminpass123' });
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ username: 'admin', role: 'admin' });
      expect(res.body.user.passwordHash).toBeUndefined();
    });
  });

  describe('GET /api/auth/bootstrap-status (after bootstrap)', () => {
    it('returns setupRequired: false once admin exists', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const res = await agent.get('/api/auth/bootstrap-status');
      expect(res.status).toBe(200);
      expect(res.body.setupRequired).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 401 for wrong password', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const loginAgent = createAuthAgent(app);
      const res = await loginAs(loginAgent, 'admin', 'wrongpassword');
      expect(res.status).toBe(401);
    });

    it('returns 200 and user object for correct credentials', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const loginAgent = createAuthAgent(app);
      const res = await loginAs(loginAgent, 'admin', 'adminpass123');
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ username: 'admin', role: 'admin' });
    });

    it('returns 401 for unknown username', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const loginAgent = createAuthAgent(app);
      const res = await loginAs(loginAgent, 'nobody', 'adminpass123');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns { user: null } when not logged in', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const anonAgent = createAuthAgent(app);
      const res = await anonAgent.get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ user: null });
    });

    it('returns user object when logged in', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const res = await agent.get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ username: 'admin', role: 'admin' });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('logs out and subsequent /me returns null', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const logoutRes = await agent.post('/api/auth/logout');
      expect(logoutRes.status).toBe(200);
      const meRes = await agent.get('/api/auth/me');
      expect(meRes.body).toEqual({ user: null });
    });
  });

  describe('PATCH /api/auth/me', () => {
    it('updates display name and bio', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const res = await agent.patch('/api/auth/me').send({ displayName: 'Admin User', bio: 'Test bio' });
      expect(res.status).toBe(200);
      expect(res.body.user.displayName).toBe('Admin User');
      expect(res.body.user.bio).toBe('Test bio');
    });

    it('returns 401 when not logged in', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const anonAgent = createAuthAgent(app);
      const res = await anonAgent.patch('/api/auth/me').send({ displayName: 'Hacker' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('changes password successfully', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const res = await agent
        .post('/api/auth/change-password')
        .send({ currentPassword: 'adminpass123', newPassword: 'newpassword456' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('password changed');
    });

    it('returns 400 when fields are missing', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const res = await agent.post('/api/auth/change-password').send({ currentPassword: 'adminpass123' });
      expect(res.status).toBe(400);
    });

    it('returns 401 for wrong current password', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const res = await agent
        .post('/api/auth/change-password')
        .send({ currentPassword: 'wrongcurrent', newPassword: 'newpassword456' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/users (admin only)', () => {
    it('returns user list for admin', async () => {
      const agent = createAuthAgent(app);
      await bootstrapTestAdmin(agent);
      const res = await agent.get('/api/auth/users');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].passwordHash).toBeUndefined();
    });
  });

  describe('POST /api/auth/users', () => {
    it('admin can create a new user', async () => {
      const adminAgent = createAuthAgent(app);
      await bootstrapTestAdmin(adminAgent);
      const res = await createTestUser(adminAgent, { username: 'newuser' });
      expect(res).toMatchObject({ username: 'newuser', role: 'user' });
    });

    it('non-admin gets 403', async () => {
      const adminAgent = createAuthAgent(app);
      await bootstrapTestAdmin(adminAgent);
      await createTestUser(adminAgent, { username: 'regularuser' });

      const userAgent = createAuthAgent(app);
      await loginAs(userAgent, 'regularuser', 'userpass123');
      const res = await userAgent.post('/api/auth/users').send({ username: 'another', password: 'anotherpass123' });
      expect(res.status).toBe(403);
    });

    it('returns 409 for duplicate username', async () => {
      const adminAgent = createAuthAgent(app);
      await bootstrapTestAdmin(adminAgent);
      await createTestUser(adminAgent, { username: 'dupuser' });
      const res = await adminAgent.post('/api/auth/users').send({ username: 'dupuser', password: 'dupuserpass' });
      expect(res.status).toBe(409);
    });
  });
});
