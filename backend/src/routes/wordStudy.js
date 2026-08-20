import { Router } from 'express';
import { buildWordStudyContext, askWordStudy } from '../services/contextBuilder.js';
import { requireLogin } from '../middleware/auth.js';

export const wordStudyRouter = Router();

// Uses the Study Assistant under the hood — real API cost per use,
// same reasoning as context.js's whole-router gate.
wordStudyRouter.use(requireLogin);

// POST /api/word-study  { module, strongsKey }
// Builds the context (dictionary gloss + every occurrence across the
// whole Bible in that module) without asking the LLM yet — mirrors the
// existing /api/context/build + /api/context/ask split, so the frontend
// can show the occurrence count immediately while the (separate, also
// potentially slow) LLM call is still in flight.
wordStudyRouter.post('/', async (req, res, next) => {
  try {
    const { module, strongsKey } = req.body;
    if (!module || !strongsKey) {
      return res.status(400).json({ error: 'module and strongsKey are both required' });
    }
    const context = await buildWordStudyContext({ module, strongsKey });
    res.json(context);
  } catch (err) {
    next(err);
  }
});

// POST /api/word-study/ask  { context }
wordStudyRouter.post('/ask', async (req, res, next) => {
  try {
    const { context } = req.body;
    if (!context) {
      return res.status(400).json({ error: 'context is required' });
    }
    const result = await askWordStudy({ context });
    res.json(result);
  } catch (err) {
    next(err);
  }
});