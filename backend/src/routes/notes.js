import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireLogin } from '../middleware/auth.js';

export const notesRouter = Router();

// Notes, highlights, and bookmarks are all personal data — gated
// behind login for the entire router. Not yet scoped to the specific
// logged-in user (that's Phase 2 — adding userId to these tables and
// filtering every query by it); for now this only gates *who* can use
// these features at all, not which user's data they see.
notesRouter.use(requireLogin);

// GET /api/notes?reference=John.3.16       -> notes anchored to that passage
// GET /api/notes?q=grace                   -> search title/body across ALL notes
// GET /api/notes                           -> everything, most recent first
notesRouter.get('/', async (req, res, next) => {
  try {
    const { reference, q } = req.query;
    const where = { userId: req.user.id };
    if (reference) where.reference = reference;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
        { quote: { contains: q, mode: 'insensitive' } },
      ];
    }
    res.json(await prisma.note.findMany({ where, orderBy: { updatedAt: 'desc' } }));
  } catch (err) {
    next(err);
  }
});

// A note can be anchored (reference + module) or freestanding (neither) —
// only `body` is required either way.
notesRouter.post('/', async (req, res, next) => {
  try {
    const { title, reference, module, quote, body, tags = [], fromAssistant = false } = req.body;
    if (!body) return res.status(400).json({ error: 'body is required' });
    res.status(201).json(
      await prisma.note.create({
        data: {
          userId: req.user.id,
          title: title || null,
          reference: reference || null,
          module: module || null,
          quote: quote || null,
          body,
          tags,
          fromAssistant,
        },
      })
    );
  } catch (err) {
    next(err);
  }
});

// --- Highlights (registered before /:id below so "highlights" isn't
// swallowed as a note id) ---
notesRouter.get('/highlights', async (req, res, next) => {
  try {
    const where = { userId: req.user.id };
    if (req.query.reference) where.reference = req.query.reference;
    res.json(await prisma.highlight.findMany({ where }));
  } catch (err) {
    next(err);
  }
});

notesRouter.post('/highlights', async (req, res, next) => {
  try {
    const { reference, module, color = 'yellow' } = req.body;
    res.status(201).json(await prisma.highlight.create({ data: { userId: req.user.id, reference, module, color } }));
  } catch (err) {
    next(err);
  }
});

// --- Bookmarks ---
notesRouter.get('/bookmarks', async (req, res, next) => {
  try {
    res.json(await prisma.bookmark.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } }));
  } catch (err) {
    next(err);
  }
});

notesRouter.post('/bookmarks', async (req, res, next) => {
  try {
    const { reference, module, label } = req.body;
    res.status(201).json(await prisma.bookmark.create({ data: { userId: req.user.id, reference, module, label } }));
  } catch (err) {
    next(err);
  }
});

// --- Single note (GET/PUT/DELETE by id) — must come after the static
// /highlights and /bookmarks routes above, or ":id" would swallow them.
//
// IMPORTANT: ownership is checked here, not just filtered in the list
// queries above. Without this, a logged-in user could view, edit, or
// delete another user's note just by guessing or enumerating an id —
// filtering the list endpoints alone does nothing to protect direct
// access by id. 404 (not 403) on a mismatch deliberately, so a user
// probing ids can't even learn that a given id belongs to someone else
// — it looks identical to the id simply not existing. ---

async function loadOwnedNote(req) {
  const note = await prisma.note.findUnique({ where: { id: req.params.id } });
  if (!note || note.userId !== req.user.id) return null;
  return note;
}

notesRouter.get('/:id', async (req, res, next) => {
  try {
    const note = await loadOwnedNote(req);
    if (!note) return res.status(404).json({ error: 'not found' });
    res.json(note);
  } catch (err) {
    next(err);
  }
});

notesRouter.put('/:id', async (req, res, next) => {
  try {
    const existing = await loadOwnedNote(req);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const { title, body, tags, reference, module, quote } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (body !== undefined) data.body = body;
    if (tags !== undefined) data.tags = tags;
    if (reference !== undefined) data.reference = reference;
    if (module !== undefined) data.module = module;
    if (quote !== undefined) data.quote = quote;
    res.json(await prisma.note.update({ where: { id: req.params.id }, data }));
  } catch (err) {
    next(err);
  }
});

notesRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await loadOwnedNote(req);
    if (!existing) return res.status(404).json({ error: 'not found' });
    await prisma.note.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});