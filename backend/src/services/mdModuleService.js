import { readdir, readFile, mkdir, rm } from 'fs/promises';
import { join, basename, resolve, normalize } from 'path';
import { marked } from 'marked';
import AdmZip from 'adm-zip';

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
        description: meta.description || meta.name || entry.name,
        source: 'markdown',
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
  }

  // Fall back to chapter-level match (e.g., "## 3" heading)
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
    content: mdToHtml(content),
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

// Strip HTML tags for plain-text inclusion in AI context
export function mdVersesToText(verses) {
  return verses
    .map((v) => v.content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .join('\n');
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
  if (!meta.type || !['BIBLE', 'COMMENTARY', 'DICT'].includes(meta.type)) {
    throw new Error('module.json must have type: "BIBLE", "COMMENTARY", or "DICT".');
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
    if (ext !== 'md' && relativePath !== 'module.json') continue;

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
