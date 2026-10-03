import { Router } from 'express';
import path from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { requireLogin } from '../middleware/auth.js';
import { uploadAvatar, uploadBanner, uploadLessonVideo, UPLOADS_PATH } from '../middleware/upload.js';
import { prisma } from '../db/prisma.js';
import { config } from '../config.js';

async function generateBannerSvg(name, description) {
  if (!config.anthropicApiKey) {
    const err = new Error('AI banner generation requires an Anthropic API key.');
    err.status = 503;
    throw err;
  }
  const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });
  const msg = await anthropic.messages.create({
    model: config.anthropicModel,
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Create a short SVG banner (1200×300) for a Bible study platform.

Name: ${name}${description ? `\nTheme: ${description}` : ''}

Rules — keep the SVG small (under 60 elements, no XML comments):
1. One full-size background <rect> filled with a dark navy linearGradient (#080e18 → #0D1B29).
2. Three to five large overlapping <ellipse> elements placed asymmetrically. Fill each with a radialGradient blending one accent color (choose from #E8A441 gold, #3F7168 teal, #F5F4F1 cream) to transparent. Opacity 0.12–0.35.
3. One or two thin <line> or simple <path> elements (stroke only, no fill) in gold or teal at opacity 0.2–0.4.
4. No text. No filters. No masks. No <image>. No XML comments.

Output: only the SVG element, no explanation, no markdown.`,
    }],
  });

  const raw = msg.content[0]?.text?.trim() ?? '';
  const stripped = raw.replace(/^```[a-zA-Z]*\s*/m, '').replace(/\s*```\s*$/m, '');
  const match = stripped.match(/<svg[\s\S]*<\/svg>/i);
  if (!match) {
    console.error('[banner-ai] Unexpected response (first 500 chars):', raw.slice(0, 500));
    const err = new Error('AI returned an incomplete SVG — try again.');
    err.status = 500;
    throw err;
  }
  return match[0];
}

export const uploadsRouter = Router();
uploadsRouter.use(requireLogin);

uploadsRouter.post('/avatar', (req, res) => {
  uploadAvatar(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const url = `/uploads/avatars/${req.file.filename}`;
    await prisma.user.update({ where: { id: req.user.id }, data: { avatarUrl: url } });
    res.json({ url });
  });
});

uploadsRouter.post('/banner/user', (req, res) => {
  uploadBanner(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const url = `/uploads/banners/${req.file.filename}`;
    await prisma.user.update({ where: { id: req.user.id }, data: { bannerUrl: url } });
    res.json({ url });
  });
});

uploadsRouter.post('/banner/ai/scriptorium/:id', async (req, res, next) => {
  try {
    const scriptorium = await prisma.scriptorium.findFirst({
      where: { id: req.params.id, ownerId: req.user.id },
    });
    if (!scriptorium) return res.status(404).json({ error: 'Not found.' });

    const svg = await generateBannerSvg(scriptorium.name, scriptorium.description);
    const bannersDir = path.join(UPLOADS_PATH, 'banners');
    mkdirSync(bannersDir, { recursive: true });
    const filename = `${randomUUID()}.svg`;
    writeFileSync(path.join(bannersDir, filename), svg);
    const url = `/uploads/banners/${filename}`;
    await prisma.scriptorium.update({ where: { id: req.params.id }, data: { bannerUrl: url } });
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

uploadsRouter.post('/banner/ai/study/:id', async (req, res, next) => {
  try {
    const study = await prisma.study.findFirst({
      where: { id: req.params.id, creatorId: req.user.id },
    });
    if (!study) return res.status(404).json({ error: 'Not found.' });

    const svg = await generateBannerSvg(study.title, study.description);
    const bannersDir = path.join(UPLOADS_PATH, 'banners');
    mkdirSync(bannersDir, { recursive: true });
    const filename = `${randomUUID()}.svg`;
    writeFileSync(path.join(bannersDir, filename), svg);
    const url = `/uploads/banners/${filename}`;
    await prisma.study.update({ where: { id: req.params.id }, data: { bannerUrl: url } });
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

uploadsRouter.post('/banner/scriptorium/:id', async (req, res) => {
  const scriptorium = await prisma.scriptorium.findFirst({
    where: { id: req.params.id, ownerId: req.user.id },
  });
  if (!scriptorium) return res.status(404).json({ error: 'Not found.' });

  uploadBanner(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const url = `/uploads/banners/${req.file.filename}`;
    await prisma.scriptorium.update({ where: { id: req.params.id }, data: { bannerUrl: url } });
    res.json({ url });
  });
});

uploadsRouter.post('/video/lesson/:id', async (req, res) => {
  const lesson = await prisma.studyLesson.findUnique({
    where: { id: req.params.id },
    include: { study: { select: { creatorId: true } } },
  });
  if (!lesson || lesson.study.creatorId !== req.user.id) {
    return res.status(404).json({ error: 'Not found.' });
  }

  uploadLessonVideo(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const url = `/uploads/lesson-videos/${req.file.filename}`;
    await prisma.studyLesson.update({ where: { id: req.params.id }, data: { videoUrl: url } });
    res.json({ url });
  });
});

uploadsRouter.delete('/video/lesson/:id', async (req, res) => {
  const lesson = await prisma.studyLesson.findUnique({
    where: { id: req.params.id },
    include: { study: { select: { creatorId: true } } },
  });
  if (!lesson || lesson.study.creatorId !== req.user.id) {
    return res.status(404).json({ error: 'Not found.' });
  }
  await prisma.studyLesson.update({ where: { id: req.params.id }, data: { videoUrl: null } });
  res.status(204).end();
});

uploadsRouter.post('/banner/study/:id', async (req, res) => {
  const study = await prisma.study.findFirst({
    where: { id: req.params.id, creatorId: req.user.id },
  });
  if (!study) return res.status(404).json({ error: 'Not found.' });

  uploadBanner(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const url = `/uploads/banners/${req.file.filename}`;
    await prisma.study.update({ where: { id: req.params.id }, data: { bannerUrl: url } });
    res.json({ url });
  });
});
