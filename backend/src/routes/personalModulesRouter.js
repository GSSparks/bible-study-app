import { Router } from 'express';
import { savePersonalEntry } from '../services/personalModuleService.js';
import { requireLogin } from '../middleware/auth.js';

export const personalModulesRouter = Router();

// Saving a new personal module requires login, to keep anonymous
// visitors from creating content. Reading already-saved ones stays
// public (via bible.js/dictionary.js's routing to this service) —
// consistent with everything else being shared/global until Phase 2
// adds real per-user ownership.
personalModulesRouter.use(requireLogin);

// POST /api/personal-modules/save
// { type: 'DICT'|'COMMENTARY', key?, reference?, title, body }
// key is required for DICT, reference is required for COMMENTARY.
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