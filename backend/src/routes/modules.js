import { Router } from 'express';
import multer from 'multer';
import { swordService } from '../services/swordService.js';
import { listPersonalModules } from '../services/personalModuleService.js';
import { filterAvailableModules } from '../services/moduleVisibilityService.js';
import { requireAdmin } from '../middleware/auth.js';
import { listMdModules, installMdModuleFromZip, removeMdModule, isMdModuleCode, mdDirName } from '../services/mdModuleService.js';
import { listBuiltinModules } from '../services/builtinLexiconService.js';

export const modulesRouter = Router();

// In-memory job store for async module installs (keyed by jobId).
// Jobs auto-delete after 5 minutes once they reach a terminal state.
const installJobs = new Map();

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
    let swordModules = await swordService.listInstalledModules(type);
    // Admins always see every installed module, including hidden ones
    // — they're the ones managing visibility, so filtering it away
    // from them would make that impossible to do from this same list.
    // Personal modules are never filtered here — they're already
    // private per-user through a completely separate mechanism, and
    // this visibility toggle is specifically about real SWORD modules.
    if (req.user?.role !== 'admin') {
      swordModules = await filterAvailableModules(swordModules);
    }
    const mdModules = await listMdModules(type);
    const builtinModules = listBuiltinModules(type);
    if (type === 'DICT' || type === 'COMMENTARY') {
      const personalModules = await listPersonalModules(type, req.user?.id);
      return res.json([...swordModules, ...personalModules, ...mdModules, ...builtinModules]);
    }
    res.json([...swordModules, ...mdModules, ...builtinModules]);
  } catch (err) {
    next(err);
  }
});

// POST /api/modules/install  { repo, moduleCode } — admin-only.
// Returns { jobId } immediately; use GET /install/progress/:jobId to stream progress.
modulesRouter.post('/install', requireAdmin, (req, res) => {
  const { repo, moduleCode } = req.body;
  if (!repo || !moduleCode) {
    return res.status(400).json({ error: 'repo and moduleCode are required' });
  }

  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const job = { status: 'running', totalPercent: 0, filePercent: 0, message: '', moduleCode };
  installJobs.set(jobId, job);

  swordService
    .installModule(repo, moduleCode, (progress) => {
      job.totalPercent = progress?.totalPercent ?? 0;
      job.filePercent = progress?.filePercent ?? 0;
      job.message = progress?.message ?? '';
    })
    .then(() => {
      job.status = 'complete';
      setTimeout(() => installJobs.delete(jobId), 5 * 60 * 1000);
    })
    .catch((err) => {
      job.status = 'error';
      job.error = err.message;
      setTimeout(() => installJobs.delete(jobId), 5 * 60 * 1000);
    });

  res.json({ jobId });
});

// GET /api/modules/install/progress/:jobId — SSE stream for install progress.
modulesRouter.get('/install/progress/:jobId', requireAdmin, (req, res) => {
  const job = installJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const tick = () => {
    if (job.status === 'running') {
      send('progress', { totalPercent: job.totalPercent, filePercent: job.filePercent, message: job.message });
    } else if (job.status === 'complete') {
      send('complete', { moduleCode: job.moduleCode });
      clearInterval(interval);
      res.end();
    } else if (job.status === 'error') {
      send('job-error', { message: job.error });
      clearInterval(interval);
      res.end();
    }
  };

  tick();
  const interval = setInterval(tick, 300);
  req.on('close', () => clearInterval(interval));
});

// POST /api/modules/upload — admin-only. requireAdmin runs BEFORE
// multer's file-parsing middleware deliberately: it only needs
// req.user (already attached from the session by the time this runs),
// not the parsed body, so a non-admin's request is rejected immediately
// rather than after fully parsing a file that could be up to 300MB.
modulesRouter.post('/upload', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    // Auto-detect zip type: MD modules contain module.json; SWORD modules contain mods.d/
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(req.file.buffer);
    const paths = zip.getEntries().map((e) => e.entryName.replace(/\\/g, '/'));
    const isMd = paths.some((p) => p === 'module.json' || /^[^/]+\/module\.json$/.test(p));

    if (isMd) {
      const moduleCode = await installMdModuleFromZip(req.file.buffer);
      return res.json({ status: 'installed', moduleCode });
    }

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
    const code = req.params.moduleCode;
    if (isMdModuleCode(code)) {
      await removeMdModule(mdDirName(code));
      return res.json({ status: 'removed', moduleCode: code });
    }
    await swordService.removeModule(code);
    res.json({ status: 'removed', moduleCode: code });
  } catch (err) {
    next(err);
  }
});