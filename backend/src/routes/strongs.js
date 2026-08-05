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
    next(err);
  }
});
