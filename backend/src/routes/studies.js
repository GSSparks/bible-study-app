import { Router } from 'express';
import { requireLogin } from '../middleware/auth.js';
import {
  createStudy,
  getStudy,
  listMyStudies,
  listScriptoriumStudies,
  joinStudy,
  leaveStudy,
  listParticipants,
  deleteStudy,
  updateStudy,
  createLesson,
  bulkCreateLessons,
  generateLessonDrafts,
  updateLesson,
  deleteLesson,
  listLessons,
  getLesson,
  markLessonComplete,
  unmarkLessonComplete,
  getProgress,
  listComments,
  createComment,
  deleteComment,
  likeComment,
  unlikeComment,
  addResource,
  removeResource,
  listResources,
  getResourceContent,
} from '../services/studyService.js';

export const studiesRouter = Router();

studiesRouter.use(requireLogin);

// Static paths first — /:id below would otherwise swallow these
// (matching them as id="mine" etc.) if registered first.
studiesRouter.get('/mine', async (req, res, next) => {
  try {
    res.json(await listMyStudies(req.user.id));
  } catch (err) {
    next(err);
  }
});

studiesRouter.get('/scriptorium/:id', async (req, res, next) => {
  try {
    res.json(await listScriptoriumStudies(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});

studiesRouter.post('/', async (req, res, next) => {
  try {
    const { title, description, scriptoriumId } = req.body;
    res.status(201).json(await createStudy({ creatorId: req.user.id, title, description, scriptoriumId }));
  } catch (err) {
    next(err);
  }
});

// Lesson routes under /lessons/:lessonId — distinct static prefix from
// /:id, so no ordering ambiguity with the study routes below.
studiesRouter.put('/lessons/:lessonId', async (req, res, next) => {
  try {
    const { order, title, module, reference, body } = req.body;
    res.json(await updateLesson(req.params.lessonId, req.user.id, { order, title, module, reference, body }));
  } catch (err) {
    next(err);
  }
});

studiesRouter.delete('/lessons/:lessonId', async (req, res, next) => {
  try {
    await deleteLesson(req.params.lessonId, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

studiesRouter.get('/lessons/:lessonId', async (req, res, next) => {
  try {
    res.json(await getLesson(req.params.lessonId, req.user.id));
  } catch (err) {
    next(err);
  }
});

studiesRouter.post('/lessons/:lessonId/complete', async (req, res, next) => {
  try {
    res.json(await markLessonComplete(req.params.lessonId, req.user.id));
  } catch (err) {
    next(err);
  }
});

studiesRouter.delete('/lessons/:lessonId/complete', async (req, res, next) => {
  try {
    await unmarkLessonComplete(req.params.lessonId, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

studiesRouter.get('/lessons/:lessonId/resources/:resourceId', async (req, res, next) => {
  try {
    res.json(await getResourceContent(req.params.resourceId, req.params.lessonId, req.user.id));
  } catch (err) {
    next(err);
  }
});

studiesRouter.get('/lessons/:lessonId/comments', async (req, res, next) => {
  try {
    res.json(await listComments(req.params.lessonId, req.user.id));
  } catch (err) {
    next(err);
  }
});

studiesRouter.post('/lessons/:lessonId/comments', async (req, res, next) => {
  try {
    const { body } = req.body;
    res.status(201).json(await createComment(req.params.lessonId, req.user.id, body));
  } catch (err) {
    next(err);
  }
});

studiesRouter.delete('/comments/:commentId', async (req, res, next) => {
  try {
    await deleteComment(req.params.commentId, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

studiesRouter.post('/comments/:commentId/like', async (req, res, next) => {
  try {
    res.json(await likeComment(req.params.commentId, req.user.id));
  } catch (err) {
    next(err);
  }
});

studiesRouter.delete('/comments/:commentId/like', async (req, res, next) => {
  try {
    await unlikeComment(req.params.commentId, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

studiesRouter.get('/:id', async (req, res, next) => {
  try {
    res.json(await getStudy(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});

studiesRouter.put('/:id', async (req, res, next) => {
  try {
    const { title, description } = req.body;
    res.json(await updateStudy(req.params.id, req.user.id, { title, description }));
  } catch (err) {
    next(err);
  }
});

studiesRouter.delete('/:id', async (req, res, next) => {
  try {
    await deleteStudy(req.params.id, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

studiesRouter.post('/:id/join', async (req, res, next) => {
  try {
    res.status(201).json(await joinStudy(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});

studiesRouter.post('/:id/leave', async (req, res, next) => {
  try {
    await leaveStudy(req.params.id, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

studiesRouter.get('/:id/participants', async (req, res, next) => {
  try {
    res.json(await listParticipants(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});

studiesRouter.get('/:id/lessons', async (req, res, next) => {
  try {
    res.json(await listLessons(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});

studiesRouter.post('/:id/lessons', async (req, res, next) => {
  try {
    const { order, title, module, reference, body } = req.body;
    res.status(201).json(await createLesson(req.params.id, req.user.id, { order, title, module, reference, body }));
  } catch (err) {
    next(err);
  }
});

studiesRouter.post('/:id/lessons/bulk', async (req, res, next) => {
  try {
    const { lessons } = req.body;
    res.status(201).json(await bulkCreateLessons(req.params.id, req.user.id, lessons));
  } catch (err) {
    next(err);
  }
});

studiesRouter.post('/:id/generate-lessons', async (req, res, next) => {
  try {
    const { topic, weekCount, module } = req.body;
    res.json(await generateLessonDrafts(req.params.id, req.user.id, { topic, weekCount, module }));
  } catch (err) {
    next(err);
  }
});

studiesRouter.get('/:id/resources', async (req, res, next) => {
  try {
    res.json(await listResources(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});

studiesRouter.post('/:id/resources', async (req, res, next) => {
  try {
    const { type, label, moduleCode, url, order } = req.body;
    res.status(201).json(await addResource(req.params.id, req.user.id, { type, label, moduleCode, url, order }));
  } catch (err) {
    next(err);
  }
});

studiesRouter.delete('/resources/:resourceId', async (req, res, next) => {
  try {
    await removeResource(req.params.resourceId, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

studiesRouter.get('/:id/progress', async (req, res, next) => {
  try {
    res.json(await getProgress(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});