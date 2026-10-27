import { Router } from 'express';
import { swordService } from '../services/swordService.js';
import { searchDocuments } from '../services/pdfService.js';
import { parseReferenceInfo } from '../services/referenceParser.js';
import { prisma } from '../db/prisma.js';
import { listMdModules, searchMdCommentary } from '../services/mdModuleService.js';

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
    const { module, q, searchType = 'multiWord' } = req.query;
    if (!q) return res.status(400).json({ error: 'q query param is required' });

    const reference = parseReferenceInfo(q);

    const [bibleSearch, documentResults, noteResults, discussionResults] = await Promise.all([
      module ? swordService.search(module, q, { searchType }) : Promise.resolve({ total: 0, capped: false, verses: [] }),
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
      req.user
        ? prisma.studyPost.findMany({
            where: {
              parentId: null,
              OR: [
                { body: { contains: q, mode: 'insensitive' } },
                { title: { contains: q, mode: 'insensitive' } },
              ],
              study: { participants: { some: { userId: req.user.id } } },
            },
            include: {
              author: { select: { id: true, username: true, displayName: true } },
              study: { select: { id: true, title: true, scriptoriumId: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
          })
        : Promise.resolve([]),
    ]);

    res.json({
      query: q,
      reference,
      bible: bibleSearch.verses,
      total: bibleSearch.total,
      capped: bibleSearch.capped,
      documents: documentResults,
      notes: noteResults,
      discussions: discussionResults,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/search/commentary?q=TERM[&module=CODE]
// Searches installed commentary modules (SWORD + MD). If no module is given,
// fans out across all installed commentaries and aggregates results.
searchRouter.get('/commentary', async (req, res, next) => {
  try {
    const { q, module: moduleCode } = req.query;
    if (!q?.trim()) return res.json([]);

    const LIMIT_PER = 50;

    async function searchOne(code, title) {
      try {
        if (code.startsWith('md:')) {
          const hits = await searchMdCommentary(code.slice(3), q, LIMIT_PER);
          return hits.map((h) => ({ module: code, moduleTitle: title, ...h }));
        }
        const { verses } = await swordService.search(code, q, { searchType: 'multiWord', limit: LIMIT_PER });
        return verses.map((v) => ({
          module: code,
          moduleTitle: title,
          reference: `${v.bibleBookShortTitle} ${v.chapter}:${v.verseNr}`,
          snippet: v.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        }));
      } catch {
        return [];
      }
    }

    let results;
    if (moduleCode) {
      let title = moduleCode;
      if (moduleCode.startsWith('md:')) {
        const mdMods = await listMdModules('COMMENTARY');
        title = mdMods.find((m) => m.name === moduleCode)?.description || moduleCode;
      } else {
        const mods = await swordService.listInstalledModules('COMMENTARY');
        title = mods.find((m) => m.name === moduleCode)?.description || moduleCode;
      }
      results = await searchOne(moduleCode, title);
    } else {
      const [swordMods, mdMods] = await Promise.all([
        swordService.listInstalledModules('COMMENTARY'),
        listMdModules('COMMENTARY'),
      ]);
      const settled = await Promise.allSettled([
        ...swordMods.map((m) => searchOne(m.name, m.description || m.name)),
        ...mdMods.map((m) => searchOne(m.name, m.description || m.name)),
      ]);
      results = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    }

    res.json(results.slice(0, 200));
  } catch (err) {
    next(err);
  }
});