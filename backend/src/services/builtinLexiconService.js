import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');

export const BUILTIN_PREFIX = 'builtin:';

// moduleCode → { meta, entries, byStrongs: Map, byLemma: Map, dir }
const modules = new Map();
let initialized = false;

function loadAll() {
  let dirs;
  try { dirs = fs.readdirSync(DATA_DIR); } catch { return; }

  for (const dir of dirs) {
    const metaPath = path.join(DATA_DIR, dir, 'module.json');
    if (!fs.existsSync(metaPath)) continue;

    let meta;
    try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch { continue; }
    if (!meta.dataFile) continue;

    const dataPath = path.join(DATA_DIR, dir, meta.dataFile);
    let entries;
    try { entries = JSON.parse(fs.readFileSync(dataPath, 'utf8')); } catch { continue; }

    const byStrongs = new Map();
    const byLemma = new Map();
    for (const entry of entries) {
      if (entry.strongs) byStrongs.set(entry.strongs.toUpperCase(), entry);
      if (entry.lemma) byLemma.set(entry.lemma, entry);
      if (entry.lemma_normalized) byLemma.set(entry.lemma_normalized.toLowerCase(), entry);
    }

    modules.set(BUILTIN_PREFIX + dir, { meta, entries, byStrongs, byLemma });
  }
}

function ensureLoaded() {
  if (!initialized) { loadAll(); initialized = true; }
}

export function isBuiltinModuleCode(code) {
  return typeof code === 'string' && code.startsWith(BUILTIN_PREFIX);
}

export function listBuiltinModules(type) {
  ensureLoaded();
  const result = [];
  for (const [moduleCode, { meta }] of modules) {
    if (!type || meta.type === type) {
      // name = module code (API identifier), description = human-readable label —
      // matches the shape used by md modules and SWORD modules.
      result.push({ name: moduleCode, description: meta.name, language: meta.language, source: 'builtin' });
    }
  }
  return result;
}

// Returns { name, moduleCode, firstParagraph, hasMore } for every builtin
// lexicon that has an entry for this Strong's key — used to enrich the
// /api/strongs/:key response without bloating it with full definitions.
export function lookupBuiltinSnippets(strongsKey) {
  ensureLoaded();
  const key = strongsKey.toUpperCase();
  const snippets = [];
  for (const [moduleCode, { meta, byStrongs }] of modules) {
    const entry = byStrongs.get(key);
    if (!entry) continue;
    const paragraphs = entry.paragraphs?.length ? entry.paragraphs : (entry.text ? [entry.text] : []);
    const firstParagraph = paragraphs[0] ?? '';
    snippets.push({
      name: meta.name,
      moduleCode,
      lemma: entry.lemma ?? null,
      transliteration: entry.transliteration ?? null,
      grammar: entry.grammar ?? null,
      firstParagraph,
      hasMore: paragraphs.length > 1 || firstParagraph.length > 400,
    });
  }
  return snippets;
}

// Returns the full Thayer-JSON entry as HTML for the dictionary pane.
export function getBuiltinDictionaryEntry(moduleCode, key) {
  ensureLoaded();
  const mod = modules.get(moduleCode);
  if (!mod) return null;

  const upper = key.toUpperCase();
  const entry =
    mod.byStrongs.get(upper) ||
    mod.byLemma.get(key) ||
    mod.byLemma.get(key.toLowerCase()) ||
    mod.entries.find((e) => e.id === key);

  if (!entry) return null;
  return entryToHtml(entry);
}

export function listBuiltinDictionaryKeys(moduleCode) {
  ensureLoaded();
  const mod = modules.get(moduleCode);
  if (!mod) return [];
  return mod.entries.map((e) => e.strongs || e.id);
}

function entryToHtml(entry) {
  const parts = [];

  const lemma = entry.lemma ?? '';
  const translit = entry.transliteration ? `<span class="lex-translit"> (${entry.transliteration})</span>` : '';
  if (lemma) parts.push(`<h2 class="lex-lemma">${lemma}${translit}</h2>`);

  if (entry.grammar) parts.push(`<p class="lex-grammar"><em>${entry.grammar}</em></p>`);

  const paragraphs = entry.paragraphs?.length ? entry.paragraphs : (entry.text ? [entry.text] : []);
  for (const p of paragraphs) {
    parts.push(`<p>${p}</p>`);
  }

  if (entry.source?.print_pages?.length) {
    const pages = entry.source.print_pages.join('–');
    parts.push(`<p class="lex-source">Thayer's, p. ${pages}</p>`);
  }

  return parts.join('\n');
}

// For word study context: full text of the entry (all paragraphs joined)
// so the AI gets the complete definition rather than just the SWORD gloss.
export function getBuiltinFullText(strongsKey) {
  ensureLoaded();
  const key = strongsKey.toUpperCase();
  for (const { byStrongs } of modules.values()) {
    const entry = byStrongs.get(key);
    if (!entry) continue;
    const paragraphs = entry.paragraphs?.length ? entry.paragraphs : (entry.text ? [entry.text] : []);
    return {
      lemma: entry.lemma ?? null,
      transliteration: entry.transliteration ?? null,
      grammar: entry.grammar ?? null,
      text: paragraphs.join('\n\n'),
    };
  }
  return null;
}
