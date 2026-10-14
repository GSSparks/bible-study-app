import { Router } from 'express';
import { swordService } from '../services/swordService.js';
import { filterAvailableModules } from '../services/moduleVisibilityService.js';
import { listMdModules, isMdModuleCode, mdDirName, getMdFullBookContent, getMdBookChapterContent } from '../services/mdModuleService.js';

export const booksRouter = Router();

// GET /api/books/installed
booksRouter.get('/installed', async (req, res, next) => {
  try {
    let swordModules = swordService.listInstalledModules('BOOK');
    if (req.user?.role !== 'admin') {
      swordModules = await filterAvailableModules(swordModules);
    }
    const mdModules = await listMdModules('BOOK');
    res.json([...swordModules, ...mdModules]);
  } catch (err) {
    next(err);
  }
});

// GET /api/books/:module/keys
booksRouter.get('/:module/keys', async (req, res, next) => {
  try {
    const keys = swordService.getBookKeys(req.params.module);
    res.json(keys);
  } catch (err) {
    next(err);
  }
});

// GET /api/books/:module/content — full concatenated book content (no key navigation)
booksRouter.get('/:module/content', async (req, res, next) => {
  try {
    let html;
    if (isMdModuleCode(req.params.module)) {
      html = await getMdFullBookContent(mdDirName(req.params.module));
    } else {
      html = swordService.getFullBookContent(req.params.module);
    }
    res.json({ html });
  } catch (err) {
    next(err);
  }
});

// GET /api/books/:module/entry?key=...
booksRouter.get('/:module/entry', async (req, res, next) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: 'key query param is required' });
    let html;
    if (isMdModuleCode(req.params.module)) {
      html = await getMdBookChapterContent(mdDirName(req.params.module), key);
      if (!html) return res.status(404).json({ error: 'Chapter not found' });
    } else {
      html = swordService.getBookEntry(req.params.module, key);
    }
    res.json({ key, html });
  } catch (err) {
    next(err);
  }
});
