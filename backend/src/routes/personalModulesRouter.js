import { Router } from 'express';
import multer from 'multer';
import {
  savePersonalEntry,
  getPersonalCommentaryEntry,
  upsertPersonalCommentaryEntry,
  listPersonalCommentaryEntryRefs,
  listAllPersonalCommentaryEntries,
  exportPersonalCommentary,
  importPersonalCommentaryFromMarkdown,
} from '../services/personalModuleService.js';
import { requireLogin } from '../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

export const personalModulesRouter = Router();

personalModulesRouter.use(requireLogin);

// POST /api/personal-modules/save
personalModulesRouter.post('/save', async (req, res, next) => {
  try {
    const { type, key, reference, title, body } = req.body;
    if (!type || !title || !body) {
      return res.status(400).json({ error: 'type, title, and body are required' });
    }
    if (type !== 'DICT' && type !== 'COMMENTARY') {
      return res.status(400).json({ error: 'type must be "DICT" or "COMMENTARY"' });
    }
    if (type === 'DICT' && !key) {
      return res.status(400).json({ error: 'key is required for DICT-type entries' });
    }
    if (type === 'COMMENTARY' && !reference) {
      return res.status(400).json({ error: 'reference is required for COMMENTARY-type entries' });
    }
    const entry = await savePersonalEntry({ type, key, reference, title, body, userId: req.user.id });
    res.json({ status: 'saved', entryId: entry.id, moduleCode: entry.moduleCode });
  } catch (err) {
    next(err);
  }
});

// GET /api/personal-modules/entries — all entries (id, reference, title, createdAt)
personalModulesRouter.get('/entries', async (req, res, next) => {
  try {
    res.json(await listAllPersonalCommentaryEntries(req.user.id));
  } catch (err) {
    next(err);
  }
});

// GET /api/personal-modules/export — full commentary as a .md download
personalModulesRouter.get('/export', async (req, res, next) => {
  try {
    const markdown = await exportPersonalCommentary(req.user.id);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="my-commentary.md"');
    res.send(markdown);
  } catch (err) {
    next(err);
  }
});

// POST /api/personal-modules/import — import from an uploaded .md file
personalModulesRouter.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const markdown = req.file.buffer.toString('utf8');
    const imported = await importPersonalCommentaryFromMarkdown(markdown, req.user.id);
    res.json({ imported });
  } catch (err) {
    next(err);
  }
});

// GET /api/personal-modules/commentary-refs?prefix=John 3:
// Returns the list of verse references that have a "My Studies" entry for
// the given chapter prefix — used by CommentaryPane to draw note indicators.
personalModulesRouter.get('/commentary-refs', async (req, res, next) => {
  try {
    const { prefix } = req.query;
    if (!prefix) return res.json([]);
    const refs = await listPersonalCommentaryEntryRefs(prefix, req.user.id);
    res.json(refs);
  } catch (err) {
    next(err);
  }
});

// GET /api/personal-modules/commentary-entry?reference=John 3:16
// Returns the existing "My Studies" entry for this reference, or 204 if none.
personalModulesRouter.get('/commentary-entry', async (req, res, next) => {
  try {
    const { reference } = req.query;
    if (!reference) return res.status(400).json({ error: 'reference is required' });
    const entry = await getPersonalCommentaryEntry(reference, req.user.id);
    if (!entry) return res.status(204).end();
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

// PUT /api/personal-modules/commentary-entry
// { reference, title, bodyMd } — upserts into "My Studies".
personalModulesRouter.put('/commentary-entry', async (req, res, next) => {
  try {
    const { reference, title, bodyMd } = req.body;
    if (!reference || !bodyMd) return res.status(400).json({ error: 'reference and bodyMd are required' });
    const entry = await upsertPersonalCommentaryEntry({
      reference,
      title: title || `Note on ${reference}`,
      bodyMd,
      userId: req.user.id,
    });
    res.json(entry);
  } catch (err) {
    next(err);
  }
});
