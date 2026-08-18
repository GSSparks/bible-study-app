import { Router } from 'express';
import { swordService } from '../services/swordService.js';
import { isPersonalModuleCode, getPersonalPassage } from '../services/personalModuleService.js';

export const bibleRouter = Router();

// GET /api/bible/:module/passage?ref=John 3:16
// A personal COMMENTARY module's "passage" is whatever saved entries
// overlap the requested reference (see getPersonalPassage for the
// range-overlap matching — a conversation saved about "John 3:16-18"
// still needs to surface when the query is just "John 3:17", the same
// way a real SWORD commentary keyed for a range would).
bibleRouter.get('/:module/passage', async (req, res, next) => {
  try {
    const { ref } = req.query;
    if (!ref) return res.status(400).json({ error: 'ref query param is required' });
    if (isPersonalModuleCode(req.params.module)) {
      const verses = await getPersonalPassage(req.params.module, ref);
      return res.json({ module: req.params.module, reference: ref, verses });
    }
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