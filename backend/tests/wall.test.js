import { describe, it, expect, beforeAll } from 'vitest';
import { getApp, createAuthAgent, bootstrapTestAdmin, loginAs, createTestUser } from './helpers.js';

describe('Wall routes', () => {
  let app;

  beforeAll(async () => {
    app = await getApp();
  });

  it('POST /api/wall/posts creates a post', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent.post('/api/wall/posts').send({ body: 'Hello, world!' });
    expect(res.status).toBe(201);
    expect(res.body.body).toBe('Hello, world!');
  });

  it('POST /api/wall/posts returns 401 for unauthenticated user', async () => {
    const adminAgent = createAuthAgent(app);
    await bootstrapTestAdmin(adminAgent);
    const anonAgent = createAuthAgent(app);
    const res = await anonAgent.post('/api/wall/posts').send({ body: 'Unauthorized post' });
    expect(res.status).toBe(401);
  });

  it('GET /api/wall/feed returns the home feed', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    await agent.post('/api/wall/posts').send({ body: 'Feed post 1' });
    await agent.post('/api/wall/posts').send({ body: 'Feed post 2' });
    const res = await agent.get('/api/wall/feed');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/wall/me returns my wall', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    await agent.post('/api/wall/posts').send({ body: 'My wall post' });
    const res = await agent.get('/api/wall/me');
    expect(res.status).toBe(200);
    // getWall returns { owner, posts }
    expect(res.body).toHaveProperty('posts');
    expect(res.body).toHaveProperty('owner');
    expect(Array.isArray(res.body.posts)).toBe(true);
    expect(res.body.posts.length).toBe(1);
  });

  it('GET /api/wall/user/:username returns a user wall for a fellow', async () => {
    const adminAgent = createAuthAgent(app);
    await bootstrapTestAdmin(adminAgent);
    await createTestUser(adminAgent, { username: 'walluser' });
    const userAgent = createAuthAgent(app);
    await loginAs(userAgent, 'walluser', 'userpass123');

    // Must be fellows to view another user's wall
    const connRes = await userAgent.post('/api/connections').send({ username: 'admin' });
    const connectionId = connRes.body.id;
    await adminAgent.post(`/api/connections/${connectionId}/accept`);

    await userAgent.post('/api/wall/posts').send({ body: 'Posted by walluser' });
    const res = await adminAgent.get('/api/wall/user/walluser');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('posts');
    expect(Array.isArray(res.body.posts)).toBe(true);
    expect(res.body.posts.length).toBe(1);
  });

  it('POST /api/wall/posts/:id/comments adds a comment and returns the post', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const postRes = await agent.post('/api/wall/posts').send({ body: 'Post to comment on' });
    const postId = postRes.body.id;
    // createComment returns the whole post (with comments included)
    const res = await agent.post(`/api/wall/posts/${postId}/comments`).send({ body: 'Nice post!' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(postId);
    expect(Array.isArray(res.body.comments)).toBe(true);
    expect(res.body.comments[0].body).toBe('Nice post!');
  });

  it('DELETE /api/wall/comments/:id deletes a comment', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const postRes = await agent.post('/api/wall/posts').send({ body: 'Post with comment' });
    const postId = postRes.body.id;
    const commentRes = await agent.post(`/api/wall/posts/${postId}/comments`).send({ body: 'Delete me comment' });
    // commentRes.body is the post; comments[0].id is the comment id
    const commentId = commentRes.body.comments[0].id;
    const del = await agent.delete(`/api/wall/comments/${commentId}`);
    expect(del.status).toBe(204);
  });

  it('DELETE /api/wall/posts/:id deletes a post', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const postRes = await agent.post('/api/wall/posts').send({ body: 'Delete me post' });
    const postId = postRes.body.id;
    const del = await agent.delete(`/api/wall/posts/${postId}`);
    expect(del.status).toBe(204);
  });
});
