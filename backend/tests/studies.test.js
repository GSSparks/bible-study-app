import { describe, it, expect, beforeAll } from 'vitest';
import { getApp, createAuthAgent, bootstrapTestAdmin } from './helpers.js';

describe('Studies routes', () => {
  let app;

  beforeAll(async () => {
    app = await getApp();
  });

  async function setupAdminAndStudy(studyTitle = 'My Test Study') {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const createRes = await agent
      .post('/api/studies')
      .send({ title: studyTitle, description: 'A description' });
    expect(createRes.status).toBe(201);
    return { agent, study: createRes.body };
  }

  it('POST /api/studies creates a study', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent.post('/api/studies').send({ title: 'New Study', description: 'Desc' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'New Study' });
  });

  it('POST /api/studies returns 400 without title', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent.post('/api/studies').send({ description: 'No title' });
    expect(res.status).toBe(400);
  });

  it('GET /api/studies/mine lists my studies', async () => {
    const { agent } = await setupAdminAndStudy('Listed Study');
    const res = await agent.get('/api/studies/mine');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Listed Study');
  });

  it('GET /api/studies/:id returns the study', async () => {
    const { agent, study } = await setupAdminAndStudy('Get Study Test');
    const res = await agent.get(`/api/studies/${study.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Get Study Test');
  });

  it('GET /api/studies/:id returns 404 for non-existent study', async () => {
    const agent = createAuthAgent(app);
    await bootstrapTestAdmin(agent);
    const res = await agent.get('/api/studies/nonexistentid');
    expect(res.status).toBe(404);
  });

  it('PUT /api/studies/:id updates the study', async () => {
    const { agent, study } = await setupAdminAndStudy('Update Me');
    const res = await agent.put(`/api/studies/${study.id}`).send({ title: 'Updated Title', description: 'New desc' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
  });

  describe('Lessons', () => {
    it('POST /api/studies/:id/lessons creates a lesson', async () => {
      const { agent, study } = await setupAdminAndStudy('Lesson Study');
      const res = await agent
        .post(`/api/studies/${study.id}/lessons`)
        .send({ order: 1, title: 'Week 1: Introduction', reference: 'John 1:1', body: 'In the beginning...' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ title: 'Week 1: Introduction', order: 1 });
    });

    it('GET /api/studies/:id/lessons lists lessons', async () => {
      const { agent, study } = await setupAdminAndStudy('Lessons List Study');
      await agent.post(`/api/studies/${study.id}/lessons`).send({ order: 1, title: 'Lesson 1' });
      await agent.post(`/api/studies/${study.id}/lessons`).send({ order: 2, title: 'Lesson 2' });
      const res = await agent.get(`/api/studies/${study.id}/lessons`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('GET /api/studies/lessons/:lessonId returns a lesson', async () => {
      const { agent, study } = await setupAdminAndStudy('Get Lesson Study');
      const createLesson = await agent
        .post(`/api/studies/${study.id}/lessons`)
        .send({ order: 1, title: 'Get Me Lesson' });
      const lessonId = createLesson.body.id;
      const res = await agent.get(`/api/studies/lessons/${lessonId}`);
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Get Me Lesson');
    });

    it('PUT /api/studies/lessons/:lessonId updates a lesson', async () => {
      const { agent, study } = await setupAdminAndStudy('Update Lesson Study');
      const createLesson = await agent
        .post(`/api/studies/${study.id}/lessons`)
        .send({ order: 1, title: 'Original Lesson' });
      const lessonId = createLesson.body.id;
      const res = await agent
        .put(`/api/studies/lessons/${lessonId}`)
        .send({ order: 1, title: 'Updated Lesson', body: 'Updated body' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Lesson');
    });

    it('POST /api/studies/lessons/:lessonId/complete marks lesson complete', async () => {
      const { agent, study } = await setupAdminAndStudy('Complete Lesson Study');
      const createLesson = await agent
        .post(`/api/studies/${study.id}/lessons`)
        .send({ order: 1, title: 'Complete Me' });
      const lessonId = createLesson.body.id;
      const res = await agent.post(`/api/studies/lessons/${lessonId}/complete`);
      expect(res.status).toBe(200);
    });

    it('DELETE /api/studies/lessons/:lessonId/complete unmarks lesson complete', async () => {
      const { agent, study } = await setupAdminAndStudy('Uncomplete Lesson Study');
      const createLesson = await agent
        .post(`/api/studies/${study.id}/lessons`)
        .send({ order: 1, title: 'Uncomplete Me' });
      const lessonId = createLesson.body.id;
      await agent.post(`/api/studies/lessons/${lessonId}/complete`);
      const res = await agent.delete(`/api/studies/lessons/${lessonId}/complete`);
      expect(res.status).toBe(204);
    });

    it('GET /api/studies/:id/progress returns progress', async () => {
      const { agent, study } = await setupAdminAndStudy('Progress Study');
      const createLesson = await agent
        .post(`/api/studies/${study.id}/lessons`)
        .send({ order: 1, title: 'Lesson for Progress' });
      const lessonId = createLesson.body.id;
      await agent.post(`/api/studies/lessons/${lessonId}/complete`);
      const res = await agent.get(`/api/studies/${study.id}/progress`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('completed');
      expect(res.body).toHaveProperty('total');
      expect(res.body.completed).toBe(1);
      expect(res.body.total).toBe(1);
    });

    it('PUT /api/studies/lessons/:lessonId/reflection saves a reflection', async () => {
      const { agent, study } = await setupAdminAndStudy('Reflection Study');
      const createLesson = await agent
        .post(`/api/studies/${study.id}/lessons`)
        .send({ order: 1, title: 'Reflect On This' });
      const lessonId = createLesson.body.id;
      const res = await agent
        .put(`/api/studies/lessons/${lessonId}/reflection`)
        .send({ body: 'My personal reflection text' });
      expect(res.status).toBe(200);
      expect(res.body.body).toBe('My personal reflection text');
    });

    it('GET /api/studies/lessons/:lessonId/reflection gets a reflection', async () => {
      const { agent, study } = await setupAdminAndStudy('Get Reflection Study');
      const createLesson = await agent
        .post(`/api/studies/${study.id}/lessons`)
        .send({ order: 1, title: 'Reflect' });
      const lessonId = createLesson.body.id;
      await agent.put(`/api/studies/lessons/${lessonId}/reflection`).send({ body: 'My reflection' });
      const res = await agent.get(`/api/studies/lessons/${lessonId}/reflection`);
      expect(res.status).toBe(200);
      expect(res.body.body).toBe('My reflection');
    });
  });

  describe('Comments', () => {
    it('POST /api/studies/lessons/:lessonId/comments adds a comment', async () => {
      const { agent, study } = await setupAdminAndStudy('Comment Study');
      const createLesson = await agent
        .post(`/api/studies/${study.id}/lessons`)
        .send({ order: 1, title: 'Comment Lesson' });
      const lessonId = createLesson.body.id;
      const res = await agent
        .post(`/api/studies/lessons/${lessonId}/comments`)
        .send({ body: 'Great lesson!' });
      expect(res.status).toBe(201);
      expect(res.body.body).toBe('Great lesson!');
    });

    it('GET /api/studies/lessons/:lessonId/comments lists comments', async () => {
      const { agent, study } = await setupAdminAndStudy('List Comments Study');
      const createLesson = await agent
        .post(`/api/studies/${study.id}/lessons`)
        .send({ order: 1, title: 'Comment Lesson' });
      const lessonId = createLesson.body.id;
      await agent.post(`/api/studies/lessons/${lessonId}/comments`).send({ body: 'Comment 1' });
      await agent.post(`/api/studies/lessons/${lessonId}/comments`).send({ body: 'Comment 2' });
      const res = await agent.get(`/api/studies/lessons/${lessonId}/comments`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('DELETE /api/studies/comments/:commentId deletes a comment', async () => {
      const { agent, study } = await setupAdminAndStudy('Delete Comment Study');
      const createLesson = await agent
        .post(`/api/studies/${study.id}/lessons`)
        .send({ order: 1, title: 'Lesson' });
      const lessonId = createLesson.body.id;
      const addComment = await agent
        .post(`/api/studies/lessons/${lessonId}/comments`)
        .send({ body: 'Delete me' });
      const commentId = addComment.body.id;
      const res = await agent.delete(`/api/studies/comments/${commentId}`);
      expect(res.status).toBe(204);
    });
  });

  describe('Resources', () => {
    it('POST /api/studies/:id/resources adds a resource', async () => {
      const { agent, study } = await setupAdminAndStudy('Resource Study');
      const res = await agent
        .post(`/api/studies/${study.id}/resources`)
        .send({ type: 'link', label: 'Bible Project', url: 'https://bibleproject.com', order: 0 });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ type: 'link', label: 'Bible Project' });
    });

    it('GET /api/studies/:id/resources lists resources', async () => {
      const { agent, study } = await setupAdminAndStudy('List Resources Study');
      await agent
        .post(`/api/studies/${study.id}/resources`)
        .send({ type: 'link', label: 'Resource', url: 'https://example.com', order: 0 });
      const res = await agent.get(`/api/studies/${study.id}/resources`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    it('DELETE /api/studies/resources/:resourceId removes a resource', async () => {
      const { agent, study } = await setupAdminAndStudy('Remove Resource Study');
      const addRes = await agent
        .post(`/api/studies/${study.id}/resources`)
        .send({ type: 'link', label: 'To Remove', url: 'https://example.com', order: 0 });
      const resourceId = addRes.body.id;
      const del = await agent.delete(`/api/studies/resources/${resourceId}`);
      expect(del.status).toBe(204);
    });
  });

  describe('Export', () => {
    it('GET /api/studies/:id/export exports the study as a zip containing study.json', async () => {
      const { agent, study } = await setupAdminAndStudy('Export Study');
      await agent.post(`/api/studies/${study.id}/lessons`).send({ order: 1, title: 'Lesson 1' });
      const res = await agent.get(`/api/studies/${study.id}/export`).buffer(true).parse((r, cb) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toMatch(/attachment/);
      expect(res.headers['content-type']).toMatch(/zip/);
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip(res.body);
      const data = JSON.parse(zip.getEntry('study.json').getData().toString('utf8'));
      expect(data.title).toBe('Export Study');
      expect(Array.isArray(data.lessons)).toBe(true);
    });
  });

  it('DELETE /api/studies/:id deletes the study', async () => {
    const { agent, study } = await setupAdminAndStudy('Delete Me Study');
    const del = await agent.delete(`/api/studies/${study.id}`);
    expect(del.status).toBe(204);
    const get = await agent.get(`/api/studies/${study.id}`);
    expect(get.status).toBe(404);
  });
});
