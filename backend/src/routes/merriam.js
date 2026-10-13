import { Router } from 'express';
import { prisma } from '../db/prisma.js';

export const merriamRouter = Router();

const MW_KEY = process.env.MERRIAM_WEBSTER_API_KEY || null;
const MW_BASE = 'https://www.dictionaryapi.com/api/v3/references/collegiate/json';
const UA = 'Scriptorium/1.0 (self-hosted Bible study app; contact via GitHub)';

if (MW_KEY) {
  console.log('[merriam] Merriam-Webster API configured');
} else {
  console.log('[merriam] MERRIAM_WEBSTER_API_KEY not set — MW lookups disabled');
}

// GET /api/merriam?q=grace
// Returns a parsed Merriam-Webster Collegiate entry or null if not found / not configured.
merriamRouter.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json(null);
    if (!MW_KEY) return res.json(null);

    const normalized = q.toLowerCase();

    const cached = await prisma.merriamCache.findUnique({ where: { query: normalized } });
    if (cached) return res.json(cached.data);

    const url = `${MW_BASE}/${encodeURIComponent(q)}?key=${MW_KEY}`;
    const resp = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!resp.ok) return res.json(null);

    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) return res.json(null);

    // When no match exists MW returns an array of spelling-suggestion strings.
    if (typeof data[0] === 'string') return res.json(null);

    const entries = data.filter((e) => typeof e === 'object' && Array.isArray(e.shortdef) && e.shortdef.length);
    if (!entries.length) return res.json(null);

    const result = parseMWEntries(q, entries);

    await prisma.merriamCache.create({ data: { query: normalized, data: result } });

    res.json(result);
  } catch (err) {
    console.error('[merriam] lookup failed:', err.message);
    res.json(null);
  }
});

function parseMWEntries(query, entries) {
  const headword = (entries[0].hwi?.hw || query).replace(/\*/g, '');
  const pronunciation = entries[0].hwi?.prs?.[0]?.mw || null;

  // Collect up to 4 part-of-speech groups (noun, verb, adj…)
  const groups = [];
  for (const entry of entries.slice(0, 4)) {
    const fl = entry.fl;
    const defs = entry.shortdef;
    if (fl && defs?.length) groups.push({ fl, defs });
  }

  const etymology = parseEtymology(entries[0].et);
  const firstUse = (entries[0].date || '').replace(/\{bc\}/g, '').trim() || null;

  return {
    headword,
    pronunciation,
    groups,
    etymology,
    firstUse,
    url: `https://www.merriam-webster.com/dictionary/${encodeURIComponent(headword)}`,
  };
}

// The MW `et` field is an array of [type, content] pairs; content contains
// token markup like {it}..{/it}, {bc}, {ldquo}/{rdquo}.
function parseEtymology(et) {
  if (!Array.isArray(et) || !et.length) return null;
  const raw = et
    .filter(Array.isArray)
    .map(([type, content]) => (type === 'text' ? content : ''))
    .join('');
  const html = raw
    .replace(/\{it\}([\s\S]*?)\{\/it\}/g, '<em>$1</em>')
    .replace(/\{bc\}/g, ': ')
    .replace(/\{ldquo\}/g, '"')
    .replace(/\{rdquo\}/g, '"')
    .replace(/\{[^}]+\}/g, '')
    .trim();
  return html || null;
}
