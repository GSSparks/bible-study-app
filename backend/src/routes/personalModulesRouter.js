import { Router } from 'express';
import { savePersonalEntry, getPersonalCommentaryEntry, upsertPersonalCommentaryEntry } from '../services/personalModuleService.js';
import { requireLogin } from '../middleware/auth.js';

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
