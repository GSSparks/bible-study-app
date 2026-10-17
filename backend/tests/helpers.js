import supertest from 'supertest';

let _app = null;

/** Returns the Express app, creating it once and caching it.
 *  Lazy import so env vars are set (in setup.js) before any module
 *  that reads config.js gets loaded. */
export async function getApp() {
  if (!_app) {
    const { createApp } = await import('../src/app.js');
    _app = createApp();
  }
  return _app;
}

/** Returns a supertest agent bound to the app that persists cookies
 *  across requests — required for session-based auth. */
export function createAuthAgent(app) {
  return supertest.agent(app);
}

/** Creates the first admin account via bootstrap and logs it in.
 *  Returns the user object from the response. */
export async function bootstrapTestAdmin(agent) {
  const res = await agent
    .post('/api/auth/bootstrap')
    .send({ username: 'admin', password: 'adminpass123' });
  if (res.status !== 200) {
    throw new Error(`Bootstrap failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.user;
}

/** POSTs to /api/auth/login and returns the full supertest response. */
export async function loginAs(agent, username, password) {
  return agent.post('/api/auth/login').send({ username, password });
}

/** Creates a user account via the admin API.
 *  adminAgent must already be authenticated as an admin.
 *  Returns the user object. */
export async function createTestUser(adminAgent, { username, password = 'userpass123', role = 'user' } = {}) {
  const res = await adminAgent
    .post('/api/auth/users')
    .send({ username, password, role });
  if (res.status !== 200) {
    throw new Error(`createTestUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.user;
}
