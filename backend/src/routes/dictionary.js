import { Router } from 'express';
import { swordService } from '../services/swordService.js';
import { isPersonalModuleCode, listPersonalKeys, getPersonalEntryByKey } from '../services/personalModuleService.js';

export const dictionaryRouter = Router();

// GET /api/dictionary/:module/keys
dictionaryRouter.get('/:module/keys', async (req, res, next) => {
  try {
    if (isPersonalModuleCode(req.params.module)) {
      if (!req.user) {
        const err = new Error('Login required to access a personal module.');
        err.status = 401;
        throw err;
      }
      return res.json(await listPersonalKeys(req.params.module, req.user.id));
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
      if (!req.user) {
        const err = new Error('Login required to access a personal module.');
        err.status = 401;
        throw err;
      }
      const entry = await getPersonalEntryByKey(req.params.module, key, req.user.id);
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