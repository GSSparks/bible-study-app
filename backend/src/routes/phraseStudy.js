import { Router } from 'express';
import { buildPhraseStudyContext, askPhraseStudy } from '../services/contextBuilder.js';

export const phraseStudyRouter = Router();

// POST /api/phrase-study  { module, phrase?, strongsSequence?, displayText? }
// Pass `phrase` for exact-wording matching, `strongsSequence` (array of
// Strong's keys) for original-words matching. displayText is the
// selected English text, always carried through for the prompt/title
// even in strongsSequence mode.
phraseStudyRouter.post('/', async (req, res, next) => {
  try {
    const { module, phrase, strongsSequence, displayText } = req.body;
    const hasSequence = Array.isArray(strongsSequence) && strongsSequence.length > 0;
    if (!module || (!phrase && !hasSequence)) {
      return res.status(400).json({ error: 'module and either phrase or strongsSequence are required' });
    }
    const context = await buildPhraseStudyContext({ module, phrase, strongsSequence, displayText });
    res.json(context);
  } catch (err) {
    next(err);
  }
});

// POST /api/phrase-study/ask  { context }
phraseStudyRouter.post('/ask', async (req, res, next) => {
  try {
    const { context } = req.body;
    if (!context) {
      return res.status(400).json({ error: 'context is required' });
    }
    const result = await askPhraseStudy({ context });
    res.json(result);
  } catch (err) {
    next(err);
  }
});