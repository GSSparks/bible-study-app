import { Router } from 'express';
import { swordService } from '../services/swordService.js';
import { isMdModuleCode, mdDirName, getMdDictionaryKeys, getMdDictionaryEntry } from '../services/mdModuleService.js';
import { filterAvailableModules } from '../services/moduleVisibilityService.js';
import { getCachedSummary, generateAndCache, generateWordStudyEntry, updateEntry, listAllCached } from '../services/factbookSummaryService.js';
import { buildWordStudyContext, buildPhraseStudyContext } from '../services/contextBuilder.js';
import { requireLogin, requireAdmin } from '../middleware/auth.js';
import { prisma } from '../db/prisma.js';

const CODEX_DEFAULT_MODULE_KEY = 'codex_default_module';

async function getCodexDefaultModule() {
  const setting = await prisma.appSetting.findUnique({ where: { key: CODEX_DEFAULT_MODULE_KEY } });
  return setting?.value || 'KJV';
}

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

// GET /api/codex/entries — lightweight index of all cached entries for inline annotation
codexRouter.get('/entries', async (req, res, next) => {
  try {
    const rows = await listAllCached();
    res.json(rows.map(({ id, query, title, tags }) => ({ id, query, title, tags })));
  } catch (err) { next(err); }
});

// PATCH /api/codex/summary/:id — edit markdown or tags; requires login
codexRouter.patch('/summary/:id', requireLogin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { summaryMd, tags } = req.body;
    const result = await updateEntry(id, { summaryMd, tags });
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/codex/settings — admin: current word-study module setting
codexRouter.get('/settings', requireAdmin, async (req, res, next) => {
  try {
    res.json({ defaultModule: await getCodexDefaultModule() });
  } catch (err) { next(err); }
});

// POST /api/codex/settings — admin: set word-study default module
codexRouter.post('/settings', requireAdmin, async (req, res, next) => {
  try {
    const { defaultModule } = req.body;
    if (!defaultModule || typeof defaultModule !== 'string') {
      return res.status(400).json({ error: 'defaultModule is required' });
    }
    await prisma.appSetting.upsert({
      where: { key: CODEX_DEFAULT_MODULE_KEY },
      update: { value: defaultModule },
      create: { key: CODEX_DEFAULT_MODULE_KEY, value: defaultModule },
    });
    res.json({ defaultModule });
  } catch (err) { next(err); }
});

// POST /api/codex/word-study
// Scans the canonical module for all occurrences of a phrase or Strong's key,
// then generates (or returns a cached) occurrence-driven Codex entry.
// { query, studyType: 'english'|'original', strongsSequence?: string[], force?: bool }
codexRouter.post('/word-study', requireLogin, async (req, res, next) => {
  try {
    const { query, studyType, strongsSequence, force } = req.body;
    if (!query || !studyType) {
      return res.status(400).json({ error: 'query and studyType are required' });
    }

    const normalized = query.trim().toLowerCase();

    // Return cached entry if it already has occurrence data and force is not set.
    if (!force) {
      const existing = await prisma.factbookCache.findUnique({ where: { query: normalized } });
      if (existing?.occurrences && existing?.studyType) {
        return res.json({ ...existing, summaryHtml: null, cached: true });
      }
    }

    const module = await getCodexDefaultModule();

    // Run the appropriate occurrence scan.
    let context;
    if (studyType === 'original' && Array.isArray(strongsSequence) && strongsSequence.length > 0) {
      if (strongsSequence.length === 1) {
        context = await buildWordStudyContext({ module, strongsKey: strongsSequence[0] });
      } else {
        context = await buildPhraseStudyContext({ module, strongsSequence, displayText: query });
      }
    } else {
      context = await buildPhraseStudyContext({ module, phrase: query, displayText: query });
    }

    const occurrences = context.occurrences || [];
    const strongsKeys = studyType === 'original' && Array.isArray(strongsSequence) ? strongsSequence : [];

    // Gather dict context for a richer summary (same as the topic-only path).
    let swordModules = swordService.listInstalledModules('DICT');
    if (req.user?.role !== 'admin') swordModules = await filterAvailableModules(swordModules);
    const seen = new Set();
    const candidates = swordModules
      .slice(0, 6)
      .flatMap((mod) => {
        try {
          const keys = isMdModuleCode(mod.name)
            ? []  // skip async md modules for simplicity here
            : swordService.getDictionaryKeys(mod.name)
                .filter((k) => k.toLowerCase().includes(normalized))
                .slice(0, 3);
          return keys.filter((k) => {
            if (!/^\d+$/.test(k) && !seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); return true; }
            return false;
          }).map((key) => ({ mod, key }));
        } catch { return []; }
      })
      .slice(0, 5);

    const MAX_ENTRY_CHARS = 1200;
    const stripHtml = (html) => (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const dictEntries = (await Promise.allSettled(
      candidates.map(async ({ mod, key }) => {
        try {
          const html = swordService.getRawEntry(mod.name, key);
          const text = stripHtml(html).slice(0, MAX_ENTRY_CHARS);
          return text.length >= 30 ? { source: mod.description || mod.name, key, text } : null;
        } catch { return null; }
      })
    ))
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => r.value);

    const result = await generateWordStudyEntry(query, normalized, {
      occurrences,
      studyType,
      strongsKeys,
      dictionaryEntry: context.dictionaryEntry || null,
      truncated: context.truncated || false,
      totalOccurrenceCount: context.totalOccurrenceCount ?? occurrences.length,
      dictEntries,
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
