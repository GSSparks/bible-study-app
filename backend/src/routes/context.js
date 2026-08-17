import { Router } from 'express';
import { buildPassageContext, askStudyAssistant } from '../services/contextBuilder.js';
import { prisma } from '../db/prisma.js';

export const contextRouter = Router();

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

    const session = sessionId
      ? await prisma.studySession.update({
          where: { id: sessionId },
          data: { messages: updatedMessages, contextSnapshot: context },
        })
      : await prisma.studySession.create({
          data: {
            reference: firstPassage?.reference || null,
            module: firstPassage?.module || null,
            messages: updatedMessages,
            contextSnapshot: context,
          },
        });

    res.json({ reply, sessionId: session.id });
  } catch (err) {
    next(err);
  }
});

contextRouter.get('/sessions/:reference', async (req, res, next) => {
  try {
    res.json(
      await prisma.studySession.findMany({
        where: { reference: req.params.reference },
        orderBy: { updatedAt: 'desc' },
      })
    );
  } catch (err) {
    next(err);
  }
});