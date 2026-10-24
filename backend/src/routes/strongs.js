import { Router } from 'express';
import { swordService } from '../services/swordService.js';
import { lookupBuiltinSnippets } from '../services/builtinLexiconService.js';

export const strongsRouter = Router();

// GET /api/strongs/G26  (or H-prefixed for Hebrew)
strongsRouter.get('/:key', async (req, res, next) => {
  try {
    let entry = null;
    try {
      entry = swordService.getStrongsEntry(req.params.key);
    } catch (err) {
      // node-sword-interface throws when the key is outside the known range
      // (e.g. augmented numbers like H9002 that exceed the original lexicon,
      // or when no SWORD Strong's module is installed at all).
      if (!/returned 0/i.test(err.message)) throw err;
    }
    const builtinLexicons = lookupBuiltinSnippets(req.params.key);
    if (!entry && builtinLexicons.length === 0) {
      return res.status(404).json({ error: `No Strong's entry found for ${req.params.key}` });
    }
    res.json({ ...(entry || {}), builtinLexicons });
  } catch (err) {
    next(err);
  }
});
