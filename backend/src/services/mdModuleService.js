import { readdir, readFile, mkdir, rm } from 'fs/promises';

import { join, basename, resolve } from 'path';
import { marked } from 'marked';
import AdmZip from 'adm-zip';
import { getESwordKeys, getESwordEntry, getESwordAllEntries } from './eSwordService.js';

const MD_MODULES_PATH = process.env.MD_MODULES_PATH || '/data/md-modules';
export const MD_PREFIX = 'md:';

export function isMdModuleCode(code) {
  return typeof code === 'string' && code.startsWith(MD_PREFIX);
}

export function mdDirName(code) {
  return code.slice(MD_PREFIX.length);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function normalizeBookFileName(book) {
  return book.toLowerCase().replace(/\s+/g, '');
}

function parseRef(ref) {
  // Handles: "John 3:16", "John 3:16-18", "John 3", "1 Cor 13:1"
  // Also OSIS dot-separated: "John.3.16"
  const s = ref.trim().replace(/\./g, ' ');
  const m = s.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
  if (!m) return null;
  return {
    book: m[1].trim(),
    chapter: parseInt(m[2], 10),
    verseStart: m[3] ? parseInt(m[3], 10) : null,
    verseEnd: m[4] ? parseInt(m[4], 10) : null,
  };
}

// Split a Markdown string into sections keyed by ## headings.
// Content above the first ## heading is ignored.
function parseSections(markdown) {
  const sections = [];
  let currentKey = null;
  let currentLines = [];

  for (const line of markdown.split('\n')) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      if (currentKey !== null) {
        sections.push({ key: currentKey, content: currentLines.join('\n').trim() });
      }
      currentKey = h2[1].trim();
      currentLines = [];
    } else if (currentKey !== null) {
      currentLines.push(line);
    }
  }
  if (currentKey !== null) {
    sections.push({ key: currentKey, content: currentLines.join('\n').trim() });
  }
  return sections;
}

function mdToHtml(md) {
  if (!md) return '';
  return marked.parse(md);
}

// For Bible verse content rendered inline inside ReaderPane's <p> context,
// a single-paragraph marked output produces <p>text</p> which is a block
// element inside an inline <span>, breaking browser layout. Strip the wrapper
// when the entire content is a single <p>...</p> block.
function mdToHtmlInline(md) {
  if (!md) return '';
  const html = marked.parse(md);
  const m = html.match(/^<p>([\s\S]*?)<\/p>\n?$/);
  return m ? m[1].trim() : html;
}

async function readBookFile(moduleDirName, book) {
  const modulePath = join(MD_MODULES_PATH, moduleDirName);
  const normalized = normalizeBookFileName(book); // e.g. "gen" or "genesis"

  let files;
  try {
    files = await readdir(modulePath);
  } catch {
    return null;
  }

  // Exact match first, then prefix match in either direction so that "Gen"
  // finds "genesis.md" and "Genesis" finds "gen.md".
  const mdFiles = files.filter((f) => f.endsWith('.md') && f !== 'module.json');
  const match =
    mdFiles.find((f) => basename(f, '.md') === normalized) ||
    mdFiles.find((f) => {
      const stem = basename(f, '.md');
      return stem.startsWith(normalized) || normalized.startsWith(stem);
    });

  if (!match) return null;
  try {
    return await readFile(join(modulePath, match), 'utf8');
  } catch {
    return null;
  }
}

async function readModuleMeta(modulePath) {
  try {
    return JSON.parse(await readFile(join(modulePath, 'module.json'), 'utf8'));
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function listMdModules(type = null) {
  let entries;
  try {
    entries = await readdir(MD_MODULES_PATH, { withFileTypes: true });
  } catch {
    return [];
  }

  const modules = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const raw = await readFile(join(MD_MODULES_PATH, entry.name, 'module.json'), 'utf8');
      const meta = JSON.parse(raw);
      if (type && meta.type !== type) continue;
      modules.push({
        name: `${MD_PREFIX}${entry.name}`,
        description: meta.name || entry.name,
        source: 'markdown',
        ...(meta.sourceFile ? { sourceFile: meta.sourceFile } : {}),
      });
    } catch {
      // skip dirs without valid module.json
    }
  }
  return modules;
}

/**
 * Returns an array of verse-shaped objects for use in ReaderPane,
 * matching the shape returned by personalModuleService / swordService.
 * For commentary modules: one object per matching section.
 * For Bible modules: same — each ## chapter:verse heading is one verse.
 */
export async function getMdPassage(moduleDirName, ref) {
  const parsed = parseRef(ref);
  if (!parsed) return null;

  const markdown = await readBookFile(moduleDirName, parsed.book);
  if (!markdown) return null;

  const sections = parseSections(markdown);
  const matched = [];
  const verseEnd = parsed.verseEnd ?? parsed.verseStart;

  if (parsed.verseStart !== null) {
    for (let v = parsed.verseStart; v <= verseEnd; v++) {
      const section = sections.find((s) => s.key === `${parsed.chapter}:${v}`);
      if (section) matched.push({ verseNr: v, content: section.content });
    }
  } else {
    // Chapter-only request — collect all verse-keyed sections for this chapter
    // (e.g. ## 4:1, ## 4:2, ... from converted BIBLE modules)
    const prefix = `${parsed.chapter}:`;
    for (const s of sections) {
      if (s.key.startsWith(prefix)) {
        const v = parseInt(s.key.slice(prefix.length), 10);
        if (!isNaN(v)) matched.push({ verseNr: v, content: s.content });
      }
    }
    matched.sort((a, b) => a.verseNr - b.verseNr);
  }

  // Fall back to chapter-level match (e.g., "## 3" heading in commentary-style modules)
  if (matched.length === 0) {
    const chapterSection = sections.find((s) => s.key === String(parsed.chapter));
    if (chapterSection) matched.push({ verseNr: 1, content: chapterSection.content });
  }

  if (matched.length === 0) return null;

  return matched.map(({ verseNr, content }, i) => ({
    bibleBookShortTitle: parsed.book,
    chapter: parsed.chapter,
    verseNr,
    absoluteVerseNr: i,
    content: mdToHtmlInline(content),
    titles: [],
  }));
}

export async function getMdDictionaryKeys(moduleDirName) {
  const modulePath = join(MD_MODULES_PATH, moduleDirName);
  let files;
  try {
    files = await readdir(modulePath);
  } catch {
    return [];
  }

  const keys = [];
  for (const file of files) {
    if (file === 'module.json' || !file.endsWith('.md')) continue;
    try {
      const content = await readFile(join(modulePath, file), 'utf8');
      const sections = parseSections(content);
      if (sections.length > 0) {
        sections.forEach((s) => keys.push(s.key));
      } else {
        keys.push(basename(file, '.md'));
      }
    } catch {}
  }
  return keys.sort((a, b) => a.localeCompare(b));
}

export async function getMdBookChapters(moduleDirName) {
  const modulePath = join(MD_MODULES_PATH, moduleDirName);

  const meta = await readModuleMeta(modulePath);
  if (meta?.format?.startsWith('esword-')) {
    return getESwordKeys(join(modulePath, 'data.db'));
  }

  let files;
  try {
    files = await readdir(modulePath);
  } catch {
    return [];
  }

  // ThML/XML book: extract h1/h2 heading texts as chapter keys
  const xmlFile = files.find((f) => f.toLowerCase().endsWith('.xml'));
  if (xmlFile) {
    try {
      const content = await readFile(join(modulePath, xmlFile), 'utf8');
      const html = parseThml(content);
      const keys = [];
      const re = /<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi;
      let m;
      while ((m = re.exec(html))) {
        const text = m[1].replace(/<[^>]+>/g, '').trim();
        if (text) keys.push(text);
      }
      return keys;
    } catch { return []; }
  }

  const keys = [];
  const mdFiles = files
    .filter((f) => f !== 'module.json' && f.endsWith('.md'))
    .sort();

  for (const file of mdFiles) {
    try {
      const content = await readFile(join(modulePath, file), 'utf8');
      const sections = parseSections(content);
      if (sections.length > 0) {
        sections.forEach((s) => keys.push(s.key));
      } else {
        keys.push(basename(file, '.md'));
      }
    } catch {}
  }
  return keys; // document order preserved — no sort
}

// Extract the HTML section whose heading text matches key.
// Splits the HTML at h1/h2 boundaries and returns from the matching
// heading to (but not including) the next sibling heading.
function extractHtmlSection(html, key) {
  const parts = [];
  const re = /<(h[12])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let lastIndex = 0;
  let m;
  while ((m = re.exec(html))) {
    if (lastIndex < m.index) {
      parts.push({ type: 'content', html: html.slice(lastIndex, m.index) });
    }
    const text = m[2].replace(/<[^>]+>/g, '').trim();
    parts.push({ type: 'heading', text, html: m[0] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < html.length) {
    parts.push({ type: 'content', html: html.slice(lastIndex) });
  }

  let collecting = false;
  const result = [];
  for (const part of parts) {
    if (part.type === 'heading') {
      if (collecting) break;
      if (part.text === key) { collecting = true; result.push(part.html); }
    } else if (collecting) {
      result.push(part.html);
    }
  }
  return result.length ? result.join('') : null;
}

export async function getMdBookChapterContent(dirName, key) {
  const modulePath = join(MD_MODULES_PATH, dirName);

  const meta = await readModuleMeta(modulePath);
  if (meta?.format?.startsWith('esword-')) {
    const text = await getESwordEntry(join(modulePath, 'data.db'), key);
    return text ? mdToHtml(text) : null;
  }

  let files;
  try { files = await readdir(modulePath); } catch { return null; }

  const xmlFile = files.find((f) => f.toLowerCase().endsWith('.xml'));
  if (xmlFile) {
    try {
      const content = await readFile(join(modulePath, xmlFile), 'utf8');
      return extractHtmlSection(parseThml(content), key);
    } catch { return null; }
  }

  const mdFiles = files.filter((f) => f !== 'module.json' && f.endsWith('.md')).sort();
  for (const file of mdFiles) {
    try {
      const md = await readFile(join(modulePath, file), 'utf8');
      const sections = parseSections(md);
      const match = sections.find((s) => s.key === key);
      if (match) return mdToHtml(match.content);
    } catch {}
  }
  return null;
}

export async function getMdModuleType(moduleDirName) {
  try {
    const raw = await readFile(join(MD_MODULES_PATH, moduleDirName, 'module.json'), 'utf8');
    return JSON.parse(raw).type || null;
  } catch {
    return null;
  }
}

export async function getMdDictionaryEntry(moduleDirName, key) {
  const modulePath = join(MD_MODULES_PATH, moduleDirName);
  const slug = key.toLowerCase().replace(/\s+/g, '-');

  // Try individual file named after the key first
  try {
    const content = await readFile(join(modulePath, `${slug}.md`), 'utf8');
    const sections = parseSections(content);
    if (sections.length === 0) return mdToHtml(content);
    const match = sections.find((s) => s.key.toLowerCase() === key.toLowerCase());
    if (match) return mdToHtml(match.content);
  } catch {}

  // Search all .md files for a ## section matching the key
  let files;
  try {
    files = await readdir(modulePath);
  } catch {
    return null;
  }

  for (const file of files) {
    if (file === 'module.json' || !file.endsWith('.md')) continue;
    try {
      const content = await readFile(join(modulePath, file), 'utf8');
      const sections = parseSections(content);
      const match = sections.find((s) => s.key.toLowerCase() === key.toLowerCase());
      if (match) return mdToHtml(match.content);
    } catch {}
  }

  return null;
}

// ─── ThML / full-book content ─────────────────────────────────────────────────

// Convert a CCEL ThML XML file to clean HTML suitable for display in BookPane.
// ThML is essentially tagged HTML — most tags pass through; only the
// ThML-specific wrappers and semantic elements need conversion.
function parseThml(xml) {
  // Drop the header section entirely (metadata, CSS, DC fields)
  let body = xml.replace(/<ThML\.head[\s\S]*?<\/ThML\.head>/gi, '');

  // Extract the body element if present
  const bodyMatch = body.match(/<ThML\.body[^>]*>([\s\S]*?)<\/ThML\.body>/i);
  if (bodyMatch) body = bodyMatch[1];

  // div1/div2 → plain section wrappers only.  The XML already contains
  // <h1>/<h2>/<h3> child elements for each section's heading — emitting
  // an additional heading from the title="" attribute produces duplicates.
  body = body.replace(/<div1\b[^>]*>/gi, '<section>');
  body = body.replace(/<\/div1>/gi, '</section>');
  body = body.replace(/<div2\b[^>]*>/gi, '<div class="book-subsection">');
  body = body.replace(/<\/div2>/gi, '</div>');

  // scripRef → clickable verse-ref span
  body = body.replace(/<scripRef\b([^>]*)>([\s\S]*?)<\/scripRef>/gi, (_, attrs, inner) => {
    const osisM = attrs.match(/\bosisRef="([^"]*)"/i);
    const passM = attrs.match(/\bpassage="([^"]*)"/i);
    let ref = '';
    if (osisM) {
      // "Bible:Matt.20.9 Bible:John.1.1" → "Matt.20.9"
      ref = osisM[1].replace(/\bBible:/g, '').trim().split(/\s+/)[0];
    } else if (passM) {
      ref = passM[1];
    }
    // Strip any nested TOC <a> links that wrap the same text
    const text = inner.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1');
    return ref ? `<span class="verse-ref" data-ref="${ref}">${text}</span>` : text;
  });

  // TOC anchor links — strip link, keep inner text
  body = body.replace(/<a\b[^>]*class="TOC"[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  // CCEL href query-string links (?scrBook=...) — strip link, keep text
  body = body.replace(/<a\b[^>]*href="[^"]*scrBook[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, '$1');

  // <insertIndex> — editorial markers, drop entirely
  body = body.replace(/<insertIndex\b[^>]*\/?>/gi, '');

  // <l> (poetry lines) → inline span
  body = body.replace(/<l\b[^>]*>/gi, '<span class="poetic-line">').replace(/<\/l>/gi, '</span><br>');

  return body.trim();
}

// Returns full concatenated HTML content for an MD book module.
// If the module directory contains a .xml (ThML) file it is parsed;
// otherwise all .md files are concatenated in sorted order.
export async function getMdFullBookContent(dirName) {
  const modulePath = join(MD_MODULES_PATH, dirName);

  const meta = await readModuleMeta(modulePath);
  if (meta?.format?.startsWith('esword-')) {
    const entries = await getESwordAllEntries(join(modulePath, 'data.db'));
    return entries
      .map(({ key, text }) => {
        const safeKey = key.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<h2>${safeKey}</h2>\n${mdToHtml(text)}`;
      })
      .join('\n\n');
  }

  let files;
  try { files = await readdir(modulePath); } catch { return ''; }

  const xmlFile = files.find((f) => f.toLowerCase().endsWith('.xml'));
  if (xmlFile) {
    try {
      const content = await readFile(join(modulePath, xmlFile), 'utf8');
      return parseThml(content);
    } catch { return ''; }
  }

  // Fallback: concatenate markdown files
  const mdFiles = files.filter((f) => f !== 'module.json' && f.endsWith('.md')).sort();
  const parts = [];
  for (const file of mdFiles) {
    try {
      const md = await readFile(join(modulePath, file), 'utf8');
      parts.push(mdToHtml(md));
    } catch {}
  }
  return parts.join('\n');
}

// Strip HTML tags for plain-text inclusion in AI context
export function mdVersesToText(verses) {
  return verses
    .map((v) => v.content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .join('\n');
}

/**
 * Full-text search across all .md files in a commentary (or Bible) MD module.
 * Returns up to `limit` results: { reference, snippet } where reference is a
 * navigable Bible ref ("John 3:16") and snippet is plain text around the match.
 */
export async function searchMdCommentary(dirName, query, limit = 100) {
  const modulePath = join(MD_MODULES_PATH, dirName);
  let files;
  try {
    files = await readdir(modulePath);
  } catch {
    return [];
  }

  const mdFiles = files.filter((f) => f.endsWith('.md') && f !== 'module.json');
  const queryLower = query.trim().toLowerCase();
  if (!queryLower) return [];

  const results = [];

  for (const file of mdFiles) {
    if (results.length >= limit) break;
    const stem = basename(file, '.md');
    // Capitalize for a readable book name: "genesis" → "Genesis", "1corinthians" → "1Corinthians"
    const bookDisplay = stem.replace(/^(\d*)(.*)/, (_, n, rest) => n + rest.charAt(0).toUpperCase() + rest.slice(1));

    let markdown;
    try {
      markdown = await readFile(join(modulePath, file), 'utf8');
    } catch {
      continue;
    }

    for (const { key, content } of parseSections(markdown)) {
      if (results.length >= limit) break;
      const contentLower = content.toLowerCase();
      if (!contentLower.includes(queryLower)) continue;

      // Extract a short snippet centred on the first match
      const idx = contentLower.indexOf(queryLower);
      const start = Math.max(0, idx - 80);
      const end = Math.min(content.length, idx + query.length + 160);
      const raw = (start > 0 ? '…' : '') + content.slice(start, end).trim() + (end < content.length ? '…' : '');
      // Strip Markdown syntax for plain-text display
      const snippet = raw
        .replace(/```[\s\S]*?```/g, '').replace(/`([^`]+)`/g, '$1')
        .replace(/^#{1,6}\s+/gm, '').replace(/^\s*[-*+>]\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1').replace(/_([^_]+)_/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();

      results.push({ reference: `${bookDisplay} ${key}`, snippet });
    }
  }

  return results;
}

// ─── Install / remove ─────────────────────────────────────────────────────────

/**
 * Extract a zip buffer into MD_MODULES_PATH.
 *
 * Zip layout (both are accepted):
 *   flat:       module.json + *.md at zip root → dir name taken from module.json "id" or slug of "name"
 *   wrapped:    single top-level folder containing module.json + *.md → folder name used as dir name
 *
 * Returns the installed module code ("md:<dirName>").
 */
export async function installMdModuleFromZip(buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  // Detect whether the zip has a single wrapper directory
  const topDirs = new Set();
  for (const e of entries) {
    const parts = e.entryName.replace(/\\/g, '/').split('/');
    if (parts.length > 1) topDirs.add(parts[0]);
  }
  const hasSingleTopDir = topDirs.size === 1 && entries.some((e) => {
    const parts = e.entryName.replace(/\\/g, '/').split('/');
    return parts.length > 1;
  });

  // Locate module.json inside the zip
  const moduleJsonEntry = entries.find((e) => {
    const name = e.entryName.replace(/\\/g, '/');
    return hasSingleTopDir ? name === `${[...topDirs][0]}/module.json` : name === 'module.json';
  });
  if (!moduleJsonEntry) throw new Error('module.json not found in zip.');

  let meta;
  try {
    meta = JSON.parse(moduleJsonEntry.getData().toString('utf8'));
  } catch {
    throw new Error('module.json is not valid JSON.');
  }
  if (!meta.type || !['BIBLE', 'COMMENTARY', 'DICT', 'BOOK'].includes(meta.type)) {
    throw new Error('module.json must have type: "BIBLE", "COMMENTARY", "DICT", or "BOOK".');
  }

  // Determine the directory name: use wrapper dir name, or explicit "id" field, or slugify "name"
  let dirName;
  if (hasSingleTopDir) {
    dirName = [...topDirs][0];
  } else if (meta.id) {
    dirName = meta.id;
  } else if (meta.name) {
    dirName = meta.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  } else {
    throw new Error('module.json must have a "name" or "id" field.');
  }

  // Validate dirName to prevent path traversal
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(dirName)) {
    throw new Error(`Invalid module directory name: "${dirName}".`);
  }

  const destDir = resolve(MD_MODULES_PATH, dirName);
  if (!destDir.startsWith(resolve(MD_MODULES_PATH) + '/')) {
    throw new Error('Invalid module path.');
  }

  await mkdir(MD_MODULES_PATH, { recursive: true });
  await mkdir(destDir, { recursive: true });

  // Extract only .md files and module.json (skip directories and other files)
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const entryPath = entry.entryName.replace(/\\/g, '/');

    // Strip wrapper dir prefix if present
    const relativePath = hasSingleTopDir
      ? entryPath.slice([...topDirs][0].length + 1)
      : entryPath;

    if (!relativePath) continue;
    const ext = relativePath.split('.').pop()?.toLowerCase();
    if (ext !== 'md' && ext !== 'xml' && relativePath !== 'module.json') continue;

    // Path traversal guard
    const outPath = resolve(destDir, relativePath);
    if (!outPath.startsWith(destDir + '/') && outPath !== destDir) continue;

    await mkdir(resolve(destDir, relativePath, '..'), { recursive: true });
    await import('fs/promises').then(({ writeFile }) =>
      writeFile(outPath, entry.getData())
    );
  }

  return `${MD_PREFIX}${dirName}`;
}

export async function removeMdModule(dirName) {
  const target = resolve(MD_MODULES_PATH, dirName);
  // Safety: must be a direct child of MD_MODULES_PATH
  if (resolve(target, '..') !== resolve(MD_MODULES_PATH)) {
    throw new Error('Invalid module path.');
  }
  await rm(target, { recursive: true, force: true });
}
