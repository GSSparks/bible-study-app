import { Router } from 'express';
import { swordService } from '../services/swordService.js';
import { isMdModuleCode, mdDirName, getMdDictionaryKeys, getMdDictionaryEntry } from '../services/mdModuleService.js';
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

    const scoreKey = (k) => {
      const kl = k.toLowerCase();
      if (kl === normalized) return 2;
      if (kl.startsWith(normalized)) return 1;
      return 0;
    };

    const [rawKeyResults, wikipediaExtract] = await Promise.all([
      Promise.allSettled(swordModules.slice(0, 6).map(async (mod) => {
        try {
          const keys = isMdModuleCode(mod.name)
            ? await getMdDictionaryKeys(mdDirName(mod.name))
            : swordService.getDictionaryKeys(mod.name);
          return { mod, keys: keys.filter((k) => k.toLowerCase().includes(normalized)).slice(0, 5) };
        } catch { return { mod, keys: [] }; }
      })),
      fetchWikipediaExtract(q),
    ]);

    // Deduplicate by key (first module wins), rank by match quality, skip bare Strong's numbers
    const seen = new Set();
    const candidates = rawKeyResults
      .flatMap((r) => r.status === 'fulfilled' ? r.value.keys.map((key) => ({ mod: r.value.mod, key })) : [])
      .filter(({ key }) => {
        if (/^\d+$/.test(key)) return false;
        const kl = key.toLowerCase();
        if (seen.has(kl)) return false;
        seen.add(kl);
        return true;
      })
      .sort((a, b) => scoreKey(b.key) - scoreKey(a.key))
      .slice(0, 5);

    // Fetch actual entry text for each candidate
    const MAX_ENTRY_CHARS = 1500;
    const MAX_TOTAL_CHARS = 6000;
    const stripHtml = (html) => (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    let totalChars = 0;
    const entryResults = await Promise.allSettled(
      candidates.map(async ({ mod, key }) => {
        try {
          const html = isMdModuleCode(mod.name)
            ? await getMdDictionaryEntry(mdDirName(mod.name), key)
            : swordService.getRawEntry(mod.name, key);
          if (!html) return null;
          const text = stripHtml(html).slice(0, MAX_ENTRY_CHARS);
          if (text.length < 30) return null;
          return { source: mod.description || mod.name, key, text };
        } catch { return null; }
      })
    );

    const dictEntries = entryResults
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => r.value)
      .filter((e) => {
        if (totalChars >= MAX_TOTAL_CHARS) return false;
        totalChars += e.text.length;
        return true;
      });

    const result = await generateAndCache(q, normalized, {
      dictEntries,
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
