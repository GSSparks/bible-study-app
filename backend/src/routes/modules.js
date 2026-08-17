import { Router } from 'express';
import multer from 'multer';
import { swordService } from '../services/swordService.js';

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

// GET /api/modules/repositories
modulesRouter.get('/repositories', async (req, res, next) => {
  try {
    res.json(await swordService.listRepositories());
  } catch (err) {
    next(err);
  }
});

// GET /api/modules/available?repo=CrossWire&type=BIBLE
modulesRouter.get('/available', async (req, res, next) => {
  try {
    const { repo, type } = req.query;
    if (!repo) return res.status(400).json({ error: 'repo query param is required' });
    res.json(await swordService.listAvailableModules(repo, type || 'BIBLE'));
  } catch (err) {
    next(err);
  }
});

// GET /api/modules/installed?type=BIBLE|COMMENTARY|DICT
modulesRouter.get('/installed', async (req, res, next) => {
  try {
    res.json(await swordService.listInstalledModules(req.query.type || 'BIBLE'));
  } catch (err) {
    next(err);
  }
});

// POST /api/modules/install  { repo, moduleCode }
modulesRouter.post('/install', async (req, res, next) => {
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

// POST /api/modules/upload  (multipart form, field name "file", a SWORD module .zip)
modulesRouter.post('/upload', upload.single('file'), async (req, res, next) => {
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

// DELETE /api/modules/:moduleCode
modulesRouter.delete('/:moduleCode', async (req, res, next) => {
  try {
    await swordService.removeModule(req.params.moduleCode);
    res.json({ status: 'removed', moduleCode: req.params.moduleCode });
  } catch (err) {
    next(err);
  }
});