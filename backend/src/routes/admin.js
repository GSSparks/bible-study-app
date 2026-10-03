import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { requireAdmin } from '../middleware/auth.js';
import { getDbHealth, getUserMetrics, getContentMetrics } from '../services/metricsService.js';
import { listVisibilityOverrides, setModuleAvailability } from '../services/moduleVisibilityService.js';
import { swordService } from '../services/swordService.js';
import { UPLOADS_PATH } from '../middleware/upload.js';
import { prisma } from '../db/prisma.js';

export const adminRouter = Router();

// Everything here is admin-only, for the whole router — same reasoning
// as context.js/wordStudy.js gating themselves entirely rather than
// per-route: nothing added here later can accidentally end up
// unprotected by forgetting its own requireAdmin call.
adminRouter.use(requireAdmin);

// GET /api/admin/metrics
adminRouter.get('/metrics', async (req, res, next) => {
  try {
    const [dbHealth, users, content] = await Promise.all([getDbHealth(), getUserMetrics(), getContentMetrics()]);
    res.json({ dbHealth, users, content });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/modules/visibility?type=BIBLE|COMMENTARY|DICT|DAILY
// Every installed module of the given type, merged with its current
// visibility state — modules never explicitly toggled show as
// available (the implicit default), matching how
// moduleVisibilityService actually resolves availability elsewhere.
adminRouter.get('/modules/visibility', async (req, res, next) => {
  try {
    const type = req.query.type || 'BIBLE';
    const [installed, overrides] = await Promise.all([
      swordService.listInstalledModules(type),
      listVisibilityOverrides(),
    ]);
    const overrideMap = new Map(overrides.map((o) => [o.moduleCode, o.availableToUsers]));
    const result = installed.map((m) => ({
      name: m.name,
      description: m.description,
      availableToUsers: overrideMap.has(m.name) ? overrideMap.get(m.name) : true,
    }));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/modules/:moduleCode/visibility  { availableToUsers: bool }
adminRouter.post('/modules/:moduleCode/visibility', async (req, res, next) => {
  try {
    const { availableToUsers } = req.body;
    if (typeof availableToUsers !== 'boolean') {
      return res.status(400).json({ error: 'availableToUsers must be a boolean' });
    }
    const result = await setModuleAvailability(req.params.moduleCode, availableToUsers);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/posts — all posts, newest first, with author + comment count
adminRouter.get('/posts', async (req, res, next) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        author: { select: { id: true, username: true } },
        _count: { select: { comments: true } },
      },
    });
    res.json(posts);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/posts/:id — admin can remove any post
adminRouter.delete('/posts/:id', async (req, res, next) => {
  try {
    await prisma.post.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/media — all DB-referenced uploaded files
adminRouter.get('/media', async (req, res, next) => {
  try {
    const [users, scriptoriums, posts] = await Promise.all([
      prisma.user.findMany({
        where: { OR: [{ avatarUrl: { not: null } }, { bannerUrl: { not: null } }] },
        select: { id: true, username: true, avatarUrl: true, bannerUrl: true },
      }),
      prisma.scriptorium.findMany({
        where: { bannerUrl: { not: null } },
        select: { id: true, name: true, bannerUrl: true },
      }),
      prisma.post.findMany({
        where: { NOT: { mediaUrls: { equals: null } } },
        select: { id: true, mediaUrls: true, author: { select: { username: true } } },
      }),
    ]);

    const items = [];
    for (const u of users) {
      if (u.avatarUrl) items.push({ type: 'avatar', url: u.avatarUrl, ownerId: u.id, ownerName: u.username });
      if (u.bannerUrl) items.push({ type: 'userBanner', url: u.bannerUrl, ownerId: u.id, ownerName: u.username });
    }
    for (const s of scriptoriums) {
      items.push({ type: 'scriptoriumBanner', url: s.bannerUrl, ownerId: s.id, ownerName: s.name });
    }
    for (const p of posts) {
      const urls = Array.isArray(p.mediaUrls) ? p.mediaUrls : [];
      for (const m of urls) {
        items.push({ type: 'postMedia', url: m.url, mediaType: m.type, ownerId: p.id, ownerName: p.author.username });
      }
    }
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/media  { type, ownerId, url }
// Removes the physical file and clears the DB reference.
adminRouter.delete('/media', async (req, res, next) => {
  try {
    const { type, ownerId, url } = req.body;
    if (!type || !ownerId || !url) {
      return res.status(400).json({ error: 'type, ownerId, and url are required' });
    }

    const relPath = url.replace(/^\/uploads\//, '');
    const fullPath = path.join(UPLOADS_PATH, relPath);
    await fs.unlink(fullPath).catch(() => {});

    if (type === 'avatar') {
      await prisma.user.update({ where: { id: ownerId }, data: { avatarUrl: null } });
    } else if (type === 'userBanner') {
      await prisma.user.update({ where: { id: ownerId }, data: { bannerUrl: null } });
    } else if (type === 'scriptoriumBanner') {
      await prisma.scriptorium.update({ where: { id: ownerId }, data: { bannerUrl: null } });
    } else if (type === 'postMedia') {
      const post = await prisma.post.findUnique({ where: { id: ownerId } });
      if (post) {
        const updated = (Array.isArray(post.mediaUrls) ? post.mediaUrls : []).filter((m) => m.url !== url);
        await prisma.post.update({ where: { id: ownerId }, data: { mediaUrls: updated } });
      }
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});