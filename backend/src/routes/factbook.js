import { Router } from 'express';
import { swordService } from '../services/swordService.js';
import { isMdModuleCode, mdDirName, getMdDictionaryKeys } from '../services/mdModuleService.js';
import { filterAvailableModules } from '../services/moduleVisibilityService.js';
import { getCachedSummary, generateAndCache } from '../services/factbookSummaryService.js';

export const codexRouter = Router();

const UA = 'Scriptorium/1.0 (self-hosted Bible study app; contact via GitHub)';

// GET /api/codex/summary?q=Solomon
// Returns a cached AI overview, or generates + caches a new one on first request.
codexRouter.get('/summary', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) return res.status(400).json({ error: 'q must be at least 2 characters' });

    const normalized = q.toLowerCase();

    // Fast path: return cached entry
    const cached = await getCachedSummary(normalized);
    if (cached) return res.json({ ...cached, cached: true });

    // Gather context for generation — wiki fetch runs in parallel with dict key search
    let swordModules = swordService.listInstalledModules('DICT');
    if (req.user?.role !== 'admin') swordModules = await filterAvailableModules(swordModules);

    const [keyResults, wikipediaExtract] = await Promise.all([
      Promise.allSettled(swordModules.slice(0, 6).map(async (mod) => {
        try {
          const keys = isMdModuleCode(mod.name)
            ? await getMdDictionaryKeys(mdDirName(mod.name))
            : swordService.getDictionaryKeys(mod.name);
          return keys.filter((k) => k.toLowerCase().includes(normalized)).slice(0, 5);
        } catch { return []; }
      })),
      fetchWikipediaExtract(q),
    ]);
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

// Descriptions that indicate a clearly non-biblical Wikipedia article.
// These appear in the short description field (e.g. "2007 British drama film").
const NON_BIBLICAL_DESC = ['film', 'novel', 'album', 'song', 'television series', 'tv series', 'video game', 'singer', 'musician', 'actor', 'footballer'];

async function fetchWikipediaExtract(query) {
  try {
    // Bias the search toward religious/biblical articles — without this,
    // common biblical terms ("Atonement", "Ruth") surface pop-culture articles.
    const biasedSearch = `${query} (Bible OR biblical OR religion OR Christianity OR Judaism OR theology)`;

    const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
    searchUrl.searchParams.set('action', 'query');
    searchUrl.searchParams.set('list', 'search');
    searchUrl.searchParams.set('srsearch', biasedSearch);
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

    // Drop the result if the short description identifies it as a non-biblical topic.
    const desc = (summary.description || '').toLowerCase();
    if (NON_BIBLICAL_DESC.some((t) => desc.includes(t))) return null;

    return summary.extract || null;
  } catch {
    return null;
  }
}
