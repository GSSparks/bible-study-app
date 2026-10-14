import { Router } from 'express';
import { swordService } from '../services/swordService.js';
import { isPersonalModuleCode, listPersonalModules, listPersonalKeys } from '../services/personalModuleService.js';
import { isMdModuleCode, mdDirName, getMdDictionaryKeys, getMdModuleType, listMdModules, getMdBookChapters } from '../services/mdModuleService.js';
import { filterAvailableModules } from '../services/moduleVisibilityService.js';

export const topicsRouter = Router();

// GET /api/topics?q=Solomon
// Searches all installed DICT modules for entries matching the query.
// Returns [{module, description, key}] sorted: exact > starts-with > contains.
topicsRouter.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    if (!q || q.length < 2) return res.json([]);

    let swordDictModules = await swordService.listInstalledModules('DICT');
    let swordBookModules = await swordService.listInstalledModules('BOOK');
    if (req.user?.role !== 'admin') {
      swordDictModules = await filterAvailableModules(swordDictModules);
      swordBookModules = await filterAvailableModules(swordBookModules);
    }
    const mdModules = await listMdModules('DICT');
    const bookModules = await listMdModules('BOOK');
    const personalModules = await listPersonalModules('DICT', req.user?.id);
    const allModules = [
      ...swordDictModules.map((m) => ({ ...m, _swordType: 'DICT' })),
      ...swordBookModules.map((m) => ({ ...m, _swordType: 'BOOK' })),
      ...personalModules,
      ...mdModules,
      ...bookModules.map((m) => ({ ...m, _mdType: 'BOOK' })),
    ];

    const settled = await Promise.allSettled(allModules.map(async (mod) => {
      const code = mod.name;
      let keys;
      try {
        if (isMdModuleCode(code)) {
          const dirName = mdDirName(code);
          const type = await getMdModuleType(dirName);
          keys = type === 'BOOK' ? await getMdBookChapters(dirName) : await getMdDictionaryKeys(dirName);
        } else if (isPersonalModuleCode(code)) {
          keys = req.user ? await listPersonalKeys(code, req.user.id) : [];
        } else if (mod._swordType === 'BOOK') {
          keys = swordService.getBookKeys(code);
        } else {
          keys = swordService.getDictionaryKeys(code);
        }
      } catch {
        return [];
      }
      const moduleType = (mod._swordType === 'BOOK' || mod._mdType === 'BOOK') ? 'BOOK' : undefined;
      return keys
        .filter((k) => k.toLowerCase().includes(q))
        .slice(0, 15)
        .map((key) => ({ module: code, description: mod.description || code, key, ...(moduleType && { moduleType }) }));
    }));

    const hits = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

    hits.sort((a, b) => {
      const al = a.key.toLowerCase();
      const bl = b.key.toLowerCase();
      const rank = (k) => (k === q ? 0 : k.startsWith(q) ? 1 : 2);
      const diff = rank(al) - rank(bl);
      return diff !== 0 ? diff : a.key.localeCompare(b.key);
    });

    res.json(hits);
  } catch (err) {
    next(err);
  }
});
