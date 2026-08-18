import { Router } from 'express';
import { swordService } from '../services/swordService.js';
import { isPersonalModuleCode, listPersonalKeys, getPersonalEntryByKey } from '../services/personalModuleService.js';

export const dictionaryRouter = Router();

// GET /api/dictionary/:module/keys
dictionaryRouter.get('/:module/keys', async (req, res, next) => {
  try {
    if (isPersonalModuleCode(req.params.module)) {
      return res.json(await listPersonalKeys(req.params.module));
    }
    res.json(swordService.getDictionaryKeys(req.params.module));
  } catch (err) {
    next(err);
  }
});

// GET /api/dictionary/:module/entry?key=...
dictionaryRouter.get('/:module/entry', async (req, res, next) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: 'key query param is required' });
    if (isPersonalModuleCode(req.params.module)) {
      const entry = await getPersonalEntryByKey(req.params.module, key);
      if (!entry) {
        const err = new Error(`No entry found for "${key}"`);
        err.status = 404;
        throw err;
      }
      return res.json({ key, html: entry.body });
    }
    const html = swordService.getRawEntry(req.params.module, key);
    res.json({ key, html });
  } catch (err) {
    next(err);
  }
});