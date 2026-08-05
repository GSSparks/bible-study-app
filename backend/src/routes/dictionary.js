import { Router } from 'express';
import { swordService } from '../services/swordService.js';

export const dictionaryRouter = Router();

// GET /api/dictionary/:module/keys
dictionaryRouter.get('/:module/keys', async (req, res, next) => {
  try {
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
    const html = swordService.getRawEntry(req.params.module, key);
    res.json({ key, html });
  } catch (err) {
    next(err);
  }
});
