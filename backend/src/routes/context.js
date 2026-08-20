import { Router } from 'express';
import { buildPassageContext, askStudyAssistant } from '../services/contextBuilder.js';
import { prisma } from '../db/prisma.js';
import { requireLogin } from '../middleware/auth.js';

export const contextRouter = Router();

// The whole Study Assistant costs real API money per use — gated
// behind login for the entire router rather than per-route, so a
// future route added here can't accidentally end up unprotected by
// forgetting its own requireLogin call.
contextRouter.use(requireLogin);

// POST /api/context/build
// { sources: [{ module, reference, kind, title }], noteIds?: [], includeAllCommentaries?: bool, includeWordStudies?: bool }
contextRouter.post('/build', async (req, res, next) => {
  try {
    const { sources, noteIds, includeAllCommentaries, includeWordStudies } = req.body;
    if (!Array.isArray(sources) || sources.length === 0) {
      return res.status(400).json({ error: 'sources[] is required (nothing open to build context from)' });
    }
    const context = await buildPassageContext({
      sources,
      noteIds: noteIds || [],
      // IMPORTANT: buildPassageContext auto-includes notes anchored to
      // the open reference — that query needs to be scoped by userId
      // too (in contextBuilder.js itself, not yet fixed here), or a
      // logged-in user's assistant context could silently pull in
      // another user's notes. Passing userId through regardless, so
      // that fix has what it needs once it's made.
      userId: req.user.id,
      includeAllCommentaries: Boolean(includeAllCommentaries),
      includeWordStudies: Boolean(includeWordStudies),
    });
    res.json(context);
  } catch (err) {
    next(err);
  }
});

// POST /api/context/ask
// { context, messages: [{ role: 'user', content: '...' }], sessionId? }
contextRouter.post('/ask', async (req, res, next) => {
  try {
    const { context, messages, sessionId } = req.body;
    if (!context || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'context and messages[] are required' });
    }

    const { reply } = await askStudyAssistant({ context, messages });

    const updatedMessages = [...messages, { role: 'assistant', content: reply }];
    const firstPassage = context.passages[0];

    // IMPORTANT: updating an existing session needs an ownership check,
    // same IDOR concern as notes.js's single-item routes — without it,
    // a logged-in user could read and append to another user's saved
    // conversation just by supplying their sessionId. 404 (not 403) so
    // a user probing ids can't tell the difference between "doesn't
    // exist" and "exists but isn't yours".
    let session;
    if (sessionId) {
      const existing = await prisma.studySession.findUnique({ where: { id: sessionId } });
      if (!existing || existing.userId !== req.user.id) {
        const err = new Error('Session not found.');
        err.status = 404;
        throw err;
      }
      session = await prisma.studySession.update({
        where: { id: sessionId },
        data: { messages: updatedMessages, contextSnapshot: context },
      });
    } else {
      session = await prisma.studySession.create({
        data: {
          userId: req.user.id,
          reference: firstPassage?.reference || null,
          module: firstPassage?.module || null,
          messages: updatedMessages,
          contextSnapshot: context,
        },
      });
    }

    res.json({ reply, sessionId: session.id });
  } catch (err) {
    next(err);
  }
});

contextRouter.get('/sessions/:reference', async (req, res, next) => {
  try {
    res.json(
      await prisma.studySession.findMany({
        where: { reference: req.params.reference, userId: req.user.id },
        orderBy: { updatedAt: 'desc' },
      })
    );
  } catch (err) {
    next(err);
  }
});