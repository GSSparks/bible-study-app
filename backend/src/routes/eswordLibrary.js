import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { fetchCatalog, downloadModuleFile } from '../services/eswordLibraryService.js';
import { installMdModuleFromZip } from '../services/mdModuleService.js';
import { convertESword, installESwordDirect } from '../services/eSwordService.js';
import { swordService } from '../services/swordService.js';

const ESWORD_EXTS = new Set(['.bblx', '.bbli', '.cmtx', '.dctx', '.topx']);

export const eswordLibraryRouter = Router();

const installJobs = new Map();

// GET /api/esword-library/catalog — fetch and parse all alphalist pages
eswordLibraryRouter.get('/catalog', requireAdmin, async (req, res, next) => {
  try {
    const entries = await fetchCatalog();
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

// POST /api/esword-library/install { downloadUrl } — start async install, returns { jobId }
eswordLibraryRouter.post('/install', requireAdmin, (req, res) => {
  const { downloadUrl } = req.body;
  if (!downloadUrl || typeof downloadUrl !== 'string') {
    return res.status(400).json({ error: 'downloadUrl is required' });
  }
  if (!downloadUrl.startsWith('https://www.eswordlibrary.com/')) {
    return res.status(400).json({ error: 'downloadUrl must be from eswordlibrary.com' });
  }

  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const job = { status: 'running', message: 'Starting…', moduleCode: null };
  installJobs.set(jobId, job);

  runInstall(downloadUrl, job)
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

async function runInstall(downloadUrl, job) {
  const { buffer, filename } = await downloadModuleFile(downloadUrl, (msg) => { job.message = msg; });

  job.message = 'Installing…';
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';

  if (ext === '.topx') {
    job.moduleCode = await installESwordDirect(buffer, ext, filename);
    return;
  }
  if (ESWORD_EXTS.has(ext)) {
    const zipBuffer = await convertESword(buffer, ext, filename);
    job.moduleCode = await installMdModuleFromZip(zipBuffer);
    return;
  }
  // .zip — auto-detect SWORD vs MD module
  const AdmZip = (await import('adm-zip')).default;
  const zip = new AdmZip(buffer);
  const paths = zip.getEntries().map((e) => e.entryName.replace(/\\/g, '/'));
  const isMd = paths.some((p) => p === 'module.json' || /^[^/]+\/module\.json$/.test(p));
  if (isMd) {
    job.moduleCode = await installMdModuleFromZip(buffer);
  } else {
    // Check if zip contains an e-Sword file — if so, extract and convert
    const eswordEntry = zip.getEntries().find((e) => {
      const n = e.entryName.toLowerCase();
      return n.endsWith('.bblx') || n.endsWith('.bbli') || n.endsWith('.cmtx') || n.endsWith('.dctx') || n.endsWith('.topx');
    });
    if (eswordEntry) {
      const innerBuf = eswordEntry.getData();
      const innerExt = eswordEntry.entryName.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
      if (innerExt === '.topx') {
        job.moduleCode = await installESwordDirect(innerBuf, innerExt, eswordEntry.entryName);
      } else {
        const zipBuffer = await convertESword(innerBuf, innerExt, eswordEntry.entryName);
        job.moduleCode = await installMdModuleFromZip(zipBuffer);
      }
      return;
    }
    // Assume SWORD zip
    swordService.installModuleFromZip(buffer);
    job.moduleCode = filename.replace(/\.zip$/i, '');
  }
}

// GET /api/esword-library/install/progress/:jobId — SSE progress stream
eswordLibraryRouter.get('/install/progress/:jobId', requireAdmin, (req, res) => {
  const job = installJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const tick = () => {
    if (job.status === 'running') {
      send('progress', { message: job.message });
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
  const interval = setInterval(tick, 500);
  req.on('close', () => clearInterval(interval));
});
