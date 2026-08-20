import { Router } from 'express';
import multer from 'multer';
import { swordService } from '../services/swordService.js';
import { listPersonalModules } from '../services/personalModuleService.js';
import { requireAdmin } from '../middleware/auth.js';

export const modulesRouter = Router();

const upload = multer({
  limits: { fileSize: 300 * 1024 * 1024 }, // some modules (esp. commentaries) run large
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.zip')) {
      return cb(new Error('Only .zip files are accepted'));
    }
    cb(null, true);
  },
});

// GET /api/modules/repositories — admin-only: only useful as part of
// the install workflow (browsing what could be installed), and only
// admins can install anything.
modulesRouter.get('/repositories', requireAdmin, async (req, res, next) => {
  try {
    res.json(await swordService.listRepositories());
  } catch (err) {
    next(err);
  }
});

// GET /api/modules/available?repo=CrossWire&type=BIBLE — admin-only,
// same reasoning as /repositories above.
modulesRouter.get('/available', requireAdmin, async (req, res, next) => {
  try {
    const { repo, type } = req.query;
    if (!repo) return res.status(400).json({ error: 'repo query param is required' });
    res.json(await swordService.listAvailableModules(repo, type || 'BIBLE'));
  } catch (err) {
    next(err);
  }
});

// GET /api/modules/installed?type=BIBLE|COMMENTARY|DICT — stays
// public: this is what populates the module picker for actually
// *reading* content (Bible/commentary/dictionary tabs), which everyone
// — including anonymous visitors — should be able to do.
// DICT/COMMENTARY results also include personal (AI-derived) modules
// alongside real SWORD ones — same shape ({name, description}), so
// nothing downstream (module pickers, tab strips) needs to know the
// difference.
modulesRouter.get('/installed', async (req, res, next) => {
  try {
    const type = req.query.type || 'BIBLE';
    const swordModules = await swordService.listInstalledModules(type);
    if (type === 'DICT' || type === 'COMMENTARY') {
      const personalModules = await listPersonalModules(type, req.user?.id);
      return res.json([...swordModules, ...personalModules]);
    }
    res.json(swordModules);
  } catch (err) {
    next(err);
  }
});

// POST /api/modules/install  { repo, moduleCode } — admin-only.
modulesRouter.post('/install', requireAdmin, async (req, res, next) => {
  try {
    const { repo, moduleCode } = req.body;
    if (!repo || !moduleCode) {
      return res.status(400).json({ error: 'repo and moduleCode are required' });
    }
    // Fire-and-poll pattern would be nicer for large modules; keeping this
    // synchronous for simplicity. Consider SSE/WebSocket progress later.
    await swordService.installModule(repo, moduleCode);
    res.json({ status: 'installed', moduleCode });
  } catch (err) {
    next(err);
  }
});

// POST /api/modules/upload — admin-only. requireAdmin runs BEFORE
// multer's file-parsing middleware deliberately: it only needs
// req.user (already attached from the session by the time this runs),
// not the parsed body, so a non-admin's request is rejected immediately
// rather than after fully parsing a file that could be up to 300MB.
modulesRouter.post('/upload', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    swordService.installModuleFromZip(req.file.buffer);
    res.json({
      status: 'installed',
      note: "If it doesn't show up in the installed list right away, restart the backend — local module scanning may only happen at startup.",
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/modules/:moduleCode — admin-only.
modulesRouter.delete('/:moduleCode', requireAdmin, async (req, res, next) => {
  try {
    await swordService.removeModule(req.params.moduleCode);
    res.json({ status: 'removed', moduleCode: req.params.moduleCode });
  } catch (err) {
    next(err);
  }
});