import { Router } from 'express';
import { swordService } from '../services/swordService.js';
import { searchDocuments } from '../services/pdfService.js';
import { parseReferenceInfo } from '../services/referenceParser.js';
import { prisma } from '../db/prisma.js';

export const searchRouter = Router();

// GET /api/search?module=KJV&q=faith
// Also detects whether `q` itself parses as a Bible reference (e.g. "John
// 3" or "Romans 8:28-30"), so the UI can offer a direct "go to passage"
// jump alongside keyword hits — most people typing a reference into a
// search box want to navigate, not search for it as text. Also searches
// personal notes (title + body), anchored or freestanding — but ONLY
// the logged-in user's own notes, and only when logged in at all. This
// route stays public overall (Bible text and the PDF library are public
// everywhere else in this app, per bible.js/pdf.js), so it deliberately
// isn't gated behind requireLogin the way context.js/notes.js are — but
// that means the note search specifically has to scope itself, rather
// than relying on a router-level gate the way those other files do.
searchRouter.get('/', async (req, res, next) => {
  try {
    const { module, q } = req.query;
    if (!q) return res.status(400).json({ error: 'q query param is required' });

    const reference = parseReferenceInfo(q);

    const [bibleResults, documentResults, noteResults] = await Promise.all([
      module ? swordService.search(module, q) : Promise.resolve([]),
      searchDocuments(q),
      req.user
        ? prisma.note.findMany({
            where: {
              userId: req.user.id,
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { body: { contains: q, mode: 'insensitive' } },
                { quote: { contains: q, mode: 'insensitive' } },
              ],
            },
            orderBy: { updatedAt: 'desc' },
            take: 25,
          })
        : Promise.resolve([]),
    ]);

    res.json({ query: q, reference, bible: bibleResults, documents: documentResults, notes: noteResults });
  } catch (err) {
    next(err);
  }
});