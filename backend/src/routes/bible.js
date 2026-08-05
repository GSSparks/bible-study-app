import { Router } from 'express';
import { swordService } from '../services/swordService.js';

export const bibleRouter = Router();

// GET /api/bible/:module/passage?ref=John 3:16
bibleRouter.get('/:module/passage', async (req, res, next) => {
  try {
    const { ref } = req.query;
    if (!ref) return res.status(400).json({ error: 'ref query param is required' });
    const verses = swordService.getPassage(req.params.module, ref);
    res.json({ module: req.params.module, reference: ref, verses });
  } catch (err) {
    next(err);
  }
});

// POST /api/bible/compare  { modules: ["KJV","ASV"], ref: "John 3:16" }
bibleRouter.post('/compare', async (req, res, next) => {
  try {
    const { modules, ref } = req.body;
    if (!Array.isArray(modules) || !ref) {
      return res.status(400).json({ error: 'modules[] and ref are required' });
    }
    const passages = {};
    for (const m of modules) {
      passages[m] = swordService.getPassage(m, ref);
    }
    res.json({ reference: ref, passages });
  } catch (err) {
    next(err);
  }
});
