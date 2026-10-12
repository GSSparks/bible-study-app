import { Router } from 'express';
import { swordService } from '../services/swordService.js';
import { isMdModuleCode, mdDirName, getMdDictionaryKeys } from '../services/mdModuleService.js';
import { filterAvailableModules } from '../services/moduleVisibilityService.js';
import { getCachedSummary, generateAndCache } from '../services/factbookSummaryService.js';

export const factbookRouter = Router();

const UA = 'Scriptorium/1.0 (self-hosted Bible study app; contact via GitHub)';

// GET /api/factbook/summary?q=Solomon
// Returns a cached AI overview, or generates + caches a new one on first request.
factbookRouter.get('/summary', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) return res.status(400).json({ error: 'q must be at least 2 characters' });

    const normalized = q.toLowerCase();

    // Fast path: return cached entry
    const cached = await getCachedSummary(normalized);
    if (cached) return res.json({ ...cached, cached: true });

    // Gather context for generation
    const [swordModules, wikipediaExtract] = await Promise.all([
      swordService.listInstalledModules('DICT').then(async (mods) => {
        return req.user?.role !== 'admin' ? filterAvailableModules(mods) : mods;
      }),
      fetchWikipediaExtract(q),
    ]);

    const keyResults = await Promise.allSettled(swordModules.slice(0, 6).map(async (mod) => {
      try {
        const keys = isMdModuleCode(mod.name)
          ? await getMdDictionaryKeys(mdDirName(mod.name))
          : swordService.getDictionaryKeys(mod.name);
        return keys.filter((k) => k.toLowerCase().includes(normalized)).slice(0, 5);
      } catch { return []; }
    }));
    const allDictKeys = [...new Set(
      keyResults.flatMap((r) => r.status === 'fulfilled' ? r.value : [])
    )].slice(0, 20);

    const result = await generateAndCache(q, normalized, {
      dictKeys: allDictKeys,
      wikipediaExtract,
    });

    res.json({ ...result, cached: false });
  } catch (err) {
    if (err.message === 'AI not configured') {
      return res.status(503).json({ error: 'AI not configured — set ANTHROPIC_API_KEY to enable summaries' });
    }
    next(err);
  }
});

async function fetchWikipediaExtract(query) {
  try {
    const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
    searchUrl.searchParams.set('action', 'query');
    searchUrl.searchParams.set('list', 'search');
    searchUrl.searchParams.set('srsearch', query);
    searchUrl.searchParams.set('srlimit', '1');
    searchUrl.searchParams.set('format', 'json');
    const searchRes = await fetch(searchUrl.toString(), { headers: { 'User-Agent': UA } });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const topTitle = searchData?.query?.search?.[0]?.title;
    if (!topTitle) return null;
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`;
    const summaryRes = await fetch(summaryUrl, { headers: { 'User-Agent': UA } });
    if (!summaryRes.ok) return null;
    const summary = await summaryRes.json();
    return summary.extract || null;
  } catch {
    return null;
  }
}
