import { Router } from 'express';
import path from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { requireLogin } from '../middleware/auth.js';
import { uploadPostMedia, mimeToType, UPLOADS_PATH } from '../middleware/upload.js';
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
  suggestResource,
  listPendingResources,
  approveResource,
  getReflection,
  saveReflection,
  listSharedReflections,
  listAllReflections,
  exportStudy,
  importStudy,
  createStudyPost,
  createStudyReply,
  listStudyPosts,
  deleteStudyPost,
  updateStudyPost,
  listMyStudyFindings,
  createStudyHighlight,
  deleteStudyHighlight,
  listMyStudyHighlights,
  getAllParticipantProgress,
  getActivityFeed,
} from '../services/studyService.js';

export const studiesRouter = Router();

studiesRouter.use(requireLogin);

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 600 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.originalname.toLowerCase().endsWith('.zip')),
});

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

// Aggregated research endpoints — registered before /:id so Express
// doesn't match "research" as a study ID.
studiesRouter.get('/research/findings', async (req, res, next) => {
  try {
    const { reference, prefix } = req.query;
    if (!reference && !prefix) return res.status(400).json({ error: 'reference or prefix is required' });
    res.json(await listMyStudyFindings(req.user.id, { reference, prefix }));
  } catch (err) {
    next(err);
  }
});

studiesRouter.get('/research/highlights', async (req, res, next) => {
  try {
    const { reference, prefix, module } = req.query;
    if (!reference && !prefix) return res.status(400).json({ error: 'reference or prefix is required' });
    if (!module) return res.status(400).json({ error: 'module is required' });
    res.json(await listMyStudyHighlights(req.user.id, { reference, prefix, module }));
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

studiesRouter.post('/import', importUpload.single('file'), async (req, res, next) => {
  try {
    let data;

    if (req.file) {
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip(req.file.buffer);

      const jsonEntry = zip.getEntry('study.json');
      if (!jsonEntry) return res.status(400).json({ error: 'study.json not found in the zip.' });
      try {
        data = JSON.parse(jsonEntry.getData().toString('utf8'));
      } catch {
        return res.status(400).json({ error: 'study.json is not valid JSON.' });
      }

      // Extract banner if bundled
      if (data.bannerFile) {
        const entry = zip.getEntry(data.bannerFile);
        if (entry) {
          const ext = path.extname(data.bannerFile).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
            const filename = `${randomUUID()}${ext}`;
            const dir = path.join(UPLOADS_PATH, 'banners');
            mkdirSync(dir, { recursive: true });
            writeFileSync(path.join(dir, filename), entry.getData());
            data.bannerUrl = `/uploads/banners/${filename}`;
          }
        }
        delete data.bannerFile;
      }

      // Extract lesson videos if bundled
      if (Array.isArray(data.lessons)) {
        for (const lesson of data.lessons) {
          if (lesson.videoFile) {
            const entry = zip.getEntry(lesson.videoFile);
            if (entry) {
              const ext = path.extname(lesson.videoFile).toLowerCase();
              if (['.mp4', '.webm', '.mov'].includes(ext)) {
                const filename = `${randomUUID()}${ext}`;
                const dir = path.join(UPLOADS_PATH, 'lesson-videos');
                mkdirSync(dir, { recursive: true });
                writeFileSync(path.join(dir, filename), entry.getData());
                lesson.videoUrl = `/uploads/lesson-videos/${filename}`;
              }
            }
            delete lesson.videoFile;
          }
        }
      }
    } else {
      // Backward-compat: JSON body { scriptoriumId, data }
      data = req.body.data;
    }

    const scriptoriumId = req.body?.scriptoriumId || null;
    res.status(201).json(await importStudy({ scriptoriumId, creatorId: req.user.id, data }));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// Lesson routes under /lessons/:lessonId — distinct static prefix from
// /:id, so no ordering ambiguity with the study routes below.
studiesRouter.put('/lessons/:lessonId', async (req, res, next) => {
  try {
    const { order, title, module, reference, body, reflectionPrompt } = req.body;
    res.json(await updateLesson(req.params.lessonId, req.user.id, { order, title, module, reference, body, reflectionPrompt }));
  } catch (err) {
    next(err);
  }
});

studiesRouter.get('/lessons/:lessonId/reflection', async (req, res, next) => {
  try {
    res.json(await getReflection(req.params.lessonId, req.user.id));
  } catch (err) {
    next(err);
  }
});

studiesRouter.put('/lessons/:lessonId/reflection', async (req, res, next) => {
  try {
    res.json(await saveReflection(req.params.lessonId, req.user.id, req.body.body, req.body.shared));
  } catch (err) {
    next(err);
  }
});

studiesRouter.get('/lessons/:lessonId/shared-reflections', async (req, res, next) => {
  try {
    res.json(await listSharedReflections(req.params.lessonId, req.user.id));
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

studiesRouter.get('/:id/export', async (req, res, next) => {
  try {
    const data = await exportStudy(req.params.id, req.user.id);
    const slug = data.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-+|-+$/g, '');

    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip();

    // Bundle banner if it's a local upload
    if (data.bannerUrl?.startsWith('/uploads/')) {
      try {
        const filePath = path.join(UPLOADS_PATH, data.bannerUrl.slice('/uploads/'.length));
        const buf = readFileSync(filePath);
        const ext = path.extname(filePath);
        const bannerName = `banner${ext}`;
        zip.addFile(bannerName, buf);
        data.bannerFile = bannerName;
      } catch { /* file missing on disk — skip */ }
      data.bannerUrl = null;
    }

    // Bundle lesson videos that are local uploads
    for (const lesson of data.lessons) {
      if (lesson.videoUrl?.startsWith('/uploads/')) {
        try {
          const filePath = path.join(UPLOADS_PATH, lesson.videoUrl.slice('/uploads/'.length));
          const buf = readFileSync(filePath);
          const ext = path.extname(filePath);
          const videoName = `videos/lesson-${lesson.order}${ext}`;
          zip.addFile(videoName, buf);
          lesson.videoFile = videoName;
        } catch { /* file missing on disk — skip */ }
        lesson.videoUrl = null;
      }
    }

    zip.addFile('study.json', Buffer.from(JSON.stringify(data, null, 2)));

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.study.zip"`);
    res.send(zip.toBuffer());
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
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

studiesRouter.get('/:id/participants/progress', async (req, res, next) => {
  try {
    res.json(await getAllParticipantProgress(req.params.id, req.user.id));
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
    const { topic, weekCount, module, outline } = req.body;
    res.json(await generateLessonDrafts(req.params.id, req.user.id, { topic, weekCount, module, outline }));
  } catch (err) {
    next(err);
  }
});

studiesRouter.get('/:id/reflections', async (req, res, next) => {
  try {
    res.json(await listAllReflections(req.params.id, req.user.id));
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

studiesRouter.get('/:id/resources/pending', async (req, res, next) => {
  try {
    res.json(await listPendingResources(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});

studiesRouter.post('/:id/resources', async (req, res, next) => {
  try {
    const { type, label, moduleCode, moduleType, url, body, order } = req.body;
    res.status(201).json(await addResource(req.params.id, req.user.id, { type, label, moduleCode, moduleType, url, body, order }));
  } catch (err) {
    next(err);
  }
});

studiesRouter.post('/:id/resources/suggest', async (req, res, next) => {
  try {
    const { type, label, moduleCode, moduleType, url, body, order } = req.body;
    res.status(201).json(await suggestResource(req.params.id, req.user.id, { type, label, moduleCode, moduleType, url, body, order }));
  } catch (err) {
    next(err);
  }
});

studiesRouter.patch('/resources/:resourceId/approve', async (req, res, next) => {
  try {
    res.json(await approveResource(req.params.resourceId, req.user.id));
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
studiesRouter.get('/:id/posts', async (req, res, next) => {
  try {
    res.json(await listStudyPosts(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});

studiesRouter.post('/:id/posts', (req, res, next) => {
  uploadPostMedia(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const { type, reference, module, title, body } = req.body;
      const mediaUrls = (req.files || []).map((f) => ({ url: `/uploads/posts/${f.filename}`, type: mimeToType(f.mimetype) }));
      res.status(201).json(await createStudyPost(req.params.id, req.user.id, { type, reference, module, title, body, mediaUrls }));
    } catch (err) {
      next(err);
    }
  });
});

studiesRouter.put('/posts/:postId', async (req, res, next) => {
  try {
    const { body, title } = req.body;
    res.json(await updateStudyPost(req.params.postId, req.user.id, { body, title }));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

studiesRouter.post('/posts/:postId/replies', async (req, res, next) => {
  try {
    res.status(201).json(await createStudyReply(req.params.postId, req.user.id, req.body.body));
  } catch (err) {
    next(err);
  }
});

studiesRouter.delete('/posts/:postId', async (req, res, next) => {
  try {
    await deleteStudyPost(req.params.postId, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

studiesRouter.post('/:id/research/highlights', async (req, res, next) => {
  try {
    const { reference, module, color } = req.body;
    res.status(201).json(await createStudyHighlight(req.params.id, req.user.id, { reference, module, color }));
  } catch (err) {
    next(err);
  }
});

studiesRouter.delete('/:id/research/highlights/:highlightId', async (req, res, next) => {
  try {
    await deleteStudyHighlight(req.params.highlightId, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

studiesRouter.get('/:id/activity', async (req, res, next) => {
  try {
    res.json(await getActivityFeed(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});
