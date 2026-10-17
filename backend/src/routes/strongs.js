import { Router } from 'express';
import { swordService } from '../services/swordService.js';

export const strongsRouter = Router();

// GET /api/strongs/G26  (or H-prefixed for Hebrew)
strongsRouter.get('/:key', async (req, res, next) => {
  try {
    const entry = swordService.getStrongsEntry(req.params.key);
    if (!entry) return res.status(404).json({ error: `No Strong's entry found for ${req.params.key}` });
    res.json(entry);
  } catch (err) {
    // node-sword-interface throws when the key is outside the known range
    // (e.g. augmented numbers like H9002 that exceed the original lexicon).
    if (/returned 0/i.test(err.message)) {
      return res.status(404).json({ error: `No Strong's entry found for ${req.params.key}` });
    }
    next(err);
  }
});
