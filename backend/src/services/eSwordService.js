/**
 * e-Sword module converter.
 *
 * Reads an e-Sword SQLite file (.bblx / .cmtx / .dctx) and produces a zip
 * buffer in the MD-module format that installMdModuleFromZip already handles.
 * The caller never touches the SQLite file — just passes in the buffer from
 * multer and gets a zip buffer back.
 */

import { writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import AdmZip from 'adm-zip';

const MD_MODULES_PATH = process.env.MD_MODULES_PATH || '/data/md-modules';

// e-Sword book numbers 1–66 → lowercase filename stems used by MD modules.
const BOOK_STEMS = [
  null, // index 0 unused
  'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy',
  'joshua', 'judges', 'ruth', '1samuel', '2samuel',
  '1kings', '2kings', '1chronicles', '2chronicles', 'ezra',
  'nehemiah', 'esther', 'job', 'psalms', 'proverbs',
  'ecclesiastes', 'songofsolomon', 'isaiah', 'jeremiah', 'lamentations',
  'ezekiel', 'daniel', 'hosea', 'joel', 'amos',
  'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk',
  'zephaniah', 'haggai', 'zechariah', 'malachi',
  'matthew', 'mark', 'luke', 'john', 'acts',
  'romans', '1corinthians', '2corinthians', 'galatians', 'ephesians',
  'philippians', 'colossians', '1thessalonians', '2thessalonians', '1timothy',
  '2timothy', 'titus', 'philemon', 'hebrews', 'james',
  '1peter', '2peter', '1john', '2john', '3john',
  'jude', 'revelation',
];

/**
 * Converts RTF to plain text using a character-by-character parser.
 * Handles nested groups, extended destinations ({\*\...}), hex chars, and
 * the common control words (\par, \pard, \line, \tab).
 */
function stripRtf(rtf) {
  const SKIP_DESTS = new Set([
    'fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'object',
    'header', 'footer', 'headerl', 'headerr', 'headerf',
    'footerl', 'footerr', 'footerf', 'fldinst',
  ]);

  const W1252 = {
    128: '\u20AC',
    130: '\u201A',
    131: '\u0192',
    132: '\u201E',
    133: '\u2026',
    134: '\u2020',
    135: '\u2021',
    136: '\u02C6',
    137: '\u2030',
    139: '\u2039',
    145: '\u2018',
    146: '\u2019',
    147: '\u201C',
    148: '\u201D',
    149: '\u2022',
    150: '\u2013',
    151: '\u2014',
    153: '\u2122',
    155: '\u203A',
    160: '\u00A0',
    161: '\u0385',
    162: '\u0386',
    163: '\u00A3',
    164: '\u00A4',
    165: '\u00A5',
    166: '\u00A6',
    167: '\u00A7',
    168: '\u00A8',
    169: '\u00A9',
    171: '\u00AB',
    172: '\u00AC',
    173: '\u00AD',
    174: '\u00AE',
    175: '\u2015',
    176: '\u00B0',
    177: '\u00B1',
    178: '\u00B2',
    179: '\u00B3',
    180: '\u0384',
    181: '\u00B5',
    182: '\u00B6',
    183: '\u00B7',
    184: '\u0388',
    185: '\u0389',
    186: '\u038A',
    187: '\u00BB',
    188: '\u038C',
    189: '\u00BD',
    190: '\u038E',
    191: '\u038F',
    192: '\u0390',
    193: '\u0391',
    194: '\u0392',
    195: '\u0393',
    196: '\u0394',
    197: '\u0395',
    198: '\u0396',
    199: '\u0397',
    200: '\u0398',
    201: '\u0399',
    202: '\u039A',
    203: '\u039B',
    204: '\u039C',
    205: '\u039D',
    206: '\u039E',
    207: '\u039F',
    208: '\u03A0',
    209: '\u03A1',
    211: '\u03A3',
    212: '\u03A4',
    213: '\u03A5',
    214: '\u03A6',
    215: '\u03A7',
    216: '\u03A8',
    217: '\u03A9',
    218: '\u03AA',
    219: '\u03AB',
    220: '\u03AC',
    221: '\u03AD',
    222: '\u03AE',
    223: '\u03AF',
    224: '\u03B0',
    225: '\u03B1',
    226: '\u03B2',
    227: '\u03B3',
    228: '\u03B4',
    229: '\u03B5',
    230: '\u03B6',
    231: '\u03B7',
    232: '\u03B8',
    233: '\u03B9',
    234: '\u03BA',
    235: '\u03BB',
    236: '\u03BC',
    237: '\u03BD',
    238: '\u03BE',
    239: '\u03BF',
    240: '\u03C0',
    241: '\u03C1',
    242: '\u03C2',
    243: '\u03C3',
    244: '\u03C4',
    245: '\u03C5',
    246: '\u03C6',
    247: '\u03C7',
    248: '\u03C8',
    249: '\u03C9',
    250: '\u03CA',
    251: '\u03CB',
    252: '\u03CC',
    253: '\u03CD',
    254: '\u03CE',
  };
  const chunks = [];
  let i = 0, depth = 0, skipDepth = -1, firstInGroup = false;
  let bold = false, italic = false, ul = false, ulDepth = 0;
  let ulBuf = '';
  let ucFallback = 1;

  const outputting = () => skipDepth < 0 || depth <= skipDepth;
  const setSkip = () => { if (skipDepth < 0) skipDepth = depth - 1; };

  function flushUl() {
    const text = ulBuf.trim();
    ulBuf = '';
    if (!text) return;
    if (/^[1-3]?[A-Z][a-z]{1,3}_\d+:\d+/.test(text)) {
      const ref = text.replace('_', '.').replace(':', '.');
      chunks.push('<span class="verse-ref" data-ref="' + ref + '">' + text.replace('_', ' ') + '</span>');
    } else {
      chunks.push(text);
    }
  }

  function emitText(ch) {
    if (!outputting()) return;
    if (ul) { ulBuf += ch; return; }
    chunks.push(ch);
  }

  function breakParagraph() {
    if (ul) { flushUl(); ul = false; }
    if (bold) { chunks.push('</strong>'); bold = false; }
    if (italic) { chunks.push('</em>'); italic = false; }
    chunks.push('</p>\n<p>');
  }

  while (i < rtf.length) {
    const ch = rtf[i];
    if (ch === '{') { depth++; firstInGroup = true; i++; continue; }
    if (ch === '}') { depth--; if (ul && depth < ulDepth) { flushUl(); ul = false; } if (depth === skipDepth) skipDepth = -1; firstInGroup = false; i++; continue; }
    if (ch === '\r' || ch === '\n') { i++; continue; }
    if (ch !== '\\') { emitText(ch); firstInGroup = false; i++; continue; }

    i++;
    if (i >= rtf.length) break;
    const next = rtf[i];

    if (next === '*') { setSkip(); firstInGroup = false; i++; continue; }

    if (next === "'") {
      firstInGroup = false;
      const hex = rtf.slice(i + 1, i + 3);
      const code = parseInt(hex, 16);
      if (!isNaN(code) && outputting()) {
        emitText(W1252[code] !== undefined ? W1252[code] : (code < 128 ? String.fromCharCode(code) : ''));
      }
      i += 3;
      continue;
    }

    if (/[a-zA-Z]/.test(next)) {
      let word = '';
      while (i < rtf.length && /[a-zA-Z]/.test(rtf[i])) word += rtf[i++];
      let param = '';
      while (i < rtf.length && /[-\d]/.test(rtf[i])) param += rtf[i++];
      if (i < rtf.length && rtf[i] === ' ') i++;

      if (firstInGroup && SKIP_DESTS.has(word)) setSkip();
      firstInGroup = false;
      if (!outputting()) continue;

      if (word === 'par') { breakParagraph(); }
      else if (word === 'pard') { /* paragraph format reset */ }
      else if (word === 'line') { chunks.push('<br>'); }
      else if (word === 'tab') { chunks.push('\t'); }
      else if (word === 'b') {
        if (param === '0') { if (bold) { chunks.push('</strong>'); bold = false; } }
        else { if (!bold) { chunks.push('<strong>'); bold = true; } }
      }
      else if (word === 'i') {
        if (param === '0') { if (italic) { chunks.push('</em>'); italic = false; } }
        else { if (!italic) { chunks.push('<em>'); italic = true; } }
      }
      else if (word === 'ul') { ul = true; ulDepth = depth; }
      else if (word === 'ulnone') { flushUl(); ul = false; }
      else if (word === 'emdash') { emitText('\u2014'); }
      else if (word === 'endash') { emitText('\u2013'); }
      else if (word === 'lquote') { emitText('\u2018'); }
      else if (word === 'rquote') { emitText('\u2019'); }
      else if (word === 'ldblquote') { emitText('\u201C'); }
      else if (word === 'rdblquote') { emitText('\u201D'); }
      else if (word === 'uc') { const n = parseInt(param, 10); ucFallback = isNaN(n) ? 1 : n; }
      else if (word === 'u') {
        const cp = parseInt(param);
        if (!isNaN(cp) && outputting()) emitText(String.fromCodePoint(cp < 0 ? cp + 65536 : cp));
        let skip = ucFallback;
        while (skip > 0 && i < rtf.length) {
          if (rtf[i] === '\\' && i + 1 < rtf.length && rtf[i + 1] === "'") { i += 4; }
          else if (rtf[i] !== '{' && rtf[i] !== '}' && rtf[i] !== '\\') { i++; }
          else { break; }
          skip--;
        }
      }
      continue;
    }

    firstInGroup = false;
    if (outputting()) {
      if (next === '\\') emitText('\\');
      else if (next === '{') emitText('{');
      else if (next === '}') emitText('}');
      else if (next === '~') emitText('\u00A0');
    }
    i++;
  }

  if (ul) flushUl();

  return ('<p>' + chunks.join('') + '</p>')
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/(<\/p>\n<p>){2,}/g, '<\/p>\n<p>')
    .trim();
}
/**
 * Converts the e-Sword linked-Strong's RTF-fragment format into HTML.
 * Pattern: word{\cf11\super G976} — the Strong's key is a superscript after the word.
 * Also handles \{of\} escaped braces (RTF literal braces, inserted words).
 */
function convertStrongsFormat(text) {
  // Protect RTF escaped braces \{ and \} so they aren't mistaken for group delimiters
  let s = text.replace(/\\\{/g, '\x01').replace(/\\\}/g, '\x02');
  // word{\cf<n>\super G/H<n>} → <span class="strongs" data-strong="G<n>">word</span>
  s = s.replace(/(\S+)\{\\cf\d+\\super\s+([GHN]\d+)\}/g, (_, word, key) =>
    `<span class="strongs" data-strong="${key}">${word}</span>`
  );
  // Restore literal braces
  return s.replace(/\x01/g, '{').replace(/\x02/g, '}').trim();
}

/**
 * Strips e-Sword / RTF-hybrid markup and returns clean HTML suitable for
 * storage in an MD module .md file (the markdown renderer passes HTML through).
 */
function cleanMarkup(text) {
  if (text == null) return '';
  if (Buffer.isBuffer(text)) text = text.toString('utf16le').replace(/\0/g, '');
  else if (typeof text !== 'string') text = String(text);
  if (!text) return '';
  const t = text.trimStart();
  // Full RTF doc ({\rtf1...) or body fragment (\viewkind4, \pard, \b ..., etc.)
  if (t.startsWith('{\\rtf') || /^\\[a-zA-Z]/.test(t)) return stripRtf(text);
  // Linked-Strong's format: word{\cf11\super G976}
  if (/\{\\cf\d+\\super\s+[GHN]\d+\}/.test(t)) return convertStrongsFormat(text);
  // Dictionary/commentary mixed RTF: embedded {\cf\n\ul ...} verse refs or \par breaks
  if (/\{\\cf\d+\\[a-z]|\\par\b/.test(t)) return stripRtf(text);
  return text
    // Strong's numbers  <WG1234>  <WH1234>  <WN1234>
    .replace(/<W[GHN]\d+>/gi, '')
    // Words of Christ — keep the words, drop the tags
    .replace(/<FR>([\s\S]*?)<\/?Fr>/gi, '$1')
    // Italics
    .replace(/<FI>([\s\S]*?)<\/?Fi>/gi, '<em>$1</em>')
    // Bold
    .replace(/<FB>([\s\S]*?)<\/?Fb>/gi, '<strong>$1</strong>')
    // Section headings  <TS1>…<Ts>  <TS2>…<Ts>  <TS>…<Ts>
    .replace(/<TS1>([\s\S]*?)<\/?Ts>/gi, '<strong>$1</strong> ')
    .replace(/<TS2>([\s\S]*?)<\/?Ts>/gi, '<strong>$1</strong> ')
    .replace(/<TS>([\s\S]*?)<\/?Ts>/gi, '<strong>$1</strong> ')
    // OT quotes
    .replace(/<FO>([\s\S]*?)<\/?Fo>/gi, '<em>$1</em>')
    // Footnote references — strip entirely
    .replace(/<RF>([\s\S]*?)<\/?Rf>/gi, '')
    // Cross-references — strip
    .replace(/<RX>([\s\S]*?)<\/?Rx>/gi, '')
    // Paragraph breaks
    .replace(/<CI>/gi, '\n\n')
    .replace(/<CL>/gi, '\n')
    .replace(/<CM>/gi, '\n\n')
    // Paragraph indent
    .replace(/<PI\d?>/gi, '\n')
    // Misc inline formatting
    .replace(/<HI>([\s\S]*?)<\/?Hi>/gi, '<em>$1</em>')
    // Strip any remaining tags
    .replace(/<[^>]+>/g, '')
    // Collapse excess whitespace while preserving paragraph breaks
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function readDetails(db) {
  let title = '', abbrev = '', description = '';
  try {
    // Schema varies across e-Sword versions — try the most common column names.
    const row = db.prepare('SELECT * FROM Details LIMIT 1').get();
    if (row) {
      title       = row.Title || row.Description || row.Name || '';
      abbrev      = row.Abbreviation || row.Abbrev || '';
      description = row.Comments || row.Information || row.Summary || '';
    }
  } catch { /* Details table may not exist in all exports */ }
  return { title: title.trim(), abbrev: abbrev.trim(), description: description.trim() };
}

function convertBible(db) {
  const rows = db.prepare(
    'SELECT Book, Chapter, Verse, Scripture FROM Bible ORDER BY Book, Chapter, Verse'
  ).all();

  const bookContent = {};
  for (const row of rows) {
    const stem = BOOK_STEMS[row.Book];
    if (!stem) continue; // apocryphal / out-of-range book number
    if (!bookContent[stem]) bookContent[stem] = '';
    const text = cleanMarkup(row.Scripture);
    if (!text) continue;
    bookContent[stem] += `## ${row.Chapter}:${row.Verse}\n${text}\n\n`;
  }
  return bookContent;
}

function convertCommentary(db) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
  const bookContent = {};

  if (tables.includes('Commentary')) {
    // Simple schema: Commentary(Book, Chapter, Verse, Comments)
    for (const row of db.prepare('SELECT Book, Chapter, Verse, Comments FROM Commentary ORDER BY Book, Chapter, Verse').all()) {
      const stem = BOOK_STEMS[row.Book];
      if (!stem) continue;
      const text = cleanMarkup(row.Comments);
      if (!text) continue;
      if (!bookContent[stem]) bookContent[stem] = '';
      const heading = row.Verse === 0 ? `${row.Chapter}` : `${row.Chapter}:${row.Verse}`;
      bookContent[stem] += `## ${heading}\n${text}\n\n`;
    }
    return bookContent;
  }

  if (tables.includes('Verses')) {
    // Range schema: Verses(Book, ChapterBegin, ChapterEnd, VerseBegin, VerseEnd, Comments)
    //               Chapters(Book, Chapter, Comments)
    //               Books(Book, Comments)

    // Book introductions — store as chapter 0 so getMdPassage chapter-fallback can surface them
    if (tables.includes('Books')) {
      for (const row of db.prepare('SELECT Book, Comments FROM Books ORDER BY Book').all()) {
        const stem = BOOK_STEMS[row.Book];
        if (!stem) continue;
        const text = cleanMarkup(row.Comments);
        if (!text) continue;
        if (!bookContent[stem]) bookContent[stem] = '';
        bookContent[stem] += `## 0\n${text}\n\n`;
      }
    }

    // Chapter-level entries — heading is just the chapter number
    if (tables.includes('Chapters')) {
      for (const row of db.prepare('SELECT Book, Chapter, Comments FROM Chapters ORDER BY Book, Chapter').all()) {
        const stem = BOOK_STEMS[row.Book];
        if (!stem) continue;
        const text = cleanMarkup(row.Comments);
        if (!text) continue;
        if (!bookContent[stem]) bookContent[stem] = '';
        bookContent[stem] += `## ${row.Chapter}\n${text}\n\n`;
      }
    }

    // Verse-level entries — use ChapterBegin:VerseBegin as the lookup key.
    // When a range spans multiple verses, duplicate the entry for each verse so
    // getMdPassage finds it regardless of which verse the user navigates to.
    for (const row of db.prepare('SELECT Book, ChapterBegin, ChapterEnd, VerseBegin, VerseEnd, Comments FROM Verses ORDER BY Book, ChapterBegin, VerseBegin').all()) {
      const stem = BOOK_STEMS[row.Book];
      if (!stem || row.VerseBegin === 0) continue;
      const text = cleanMarkup(row.Comments);
      if (!text) continue;
      if (!bookContent[stem]) bookContent[stem] = '';
      const endVerse = (row.ChapterEnd === row.ChapterBegin) ? row.VerseEnd : row.VerseBegin;
      for (let v = row.VerseBegin; v <= endVerse; v++) {
        bookContent[stem] += `## ${row.ChapterBegin}:${v}\n${text}\n\n`;
      }
    }
    return bookContent;
  }

  const err = new Error(
    `This file doesn't look like a valid e-Sword .cmtx module. ` +
    `Expected 'Commentary' or 'Verses' table. Found: ${tables.join(', ') || '(none)'}.`
  );
  err.status = 400;
  throw err;
}

function convertDictionary(db) {
  const rows = db.prepare(
    'SELECT Topic, Definition FROM Dictionary ORDER BY Topic'
  ).all();

  let content = '';
  for (const row of rows) {
    const topic = row.Topic?.trim();
    const text  = cleanMarkup(row.Definition);
    if (!topic || !text) continue;
    content += `## ${topic}\n${text}\n\n`;
  }
  return content;
}

// .topx table/column names vary across e-Sword versions — probe what's present.
function resolveTopicTable(db) {
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).all().map((r) => r.name);

  const TABLE_CANDIDATES  = ['TopicNotes', 'Topic', 'Notes', 'Topics'];
  const TOPIC_COL_NAMES   = ['Topic', 'Name', 'Title', 'Key', 'Heading'];
  const NOTE_COL_NAMES    = ['Note', 'Notes', 'Definition', 'Content', 'Text', 'Body'];

  for (const table of TABLE_CANDIDATES) {
    if (!tables.includes(table)) continue;
    const cols = db.prepare(`PRAGMA table_info('${table}')`).all().map((c) => c.name);
    const topicCol = TOPIC_COL_NAMES.find((c) => cols.includes(c));
    const noteCol  = NOTE_COL_NAMES.find((c) => cols.includes(c));
    if (topicCol && noteCol) return { table, topicCol, noteCol };
  }

  // Nothing matched — report what's actually there so we can add it.
  const detail = TABLE_CANDIDATES
    .filter((t) => tables.includes(t))
    .map((t) => {
      const cols = db.prepare(`PRAGMA table_info('${t}')`).all().map((c) => c.name);
      return `${t}(${cols.join(', ')})`;
    })
    .join('; ');

  const err = new Error(
    `This file doesn't look like a valid e-Sword .topx module. ` +
    (detail ? `Checked: ${detail}.` : `Found tables: ${tables.join(', ') || '(none)'}.`)
  );
  err.status = 400;
  throw err;
}

function convertTopicNotes(db) {
  const { table, topicCol, noteCol } = resolveTopicTable(db);
  const rows = db.prepare(
    `SELECT \`${topicCol}\`, \`${noteCol}\` FROM \`${table}\` ORDER BY \`${topicCol}\``
  ).all();

  let content = '';
  for (const row of rows) {
    const topic = row[topicCol]?.trim();
    const text  = cleanMarkup(row[noteCol]);
    if (!topic || !text) continue;
    content += `## ${topic}\n${text}\n\n`;
  }
  return content;
}

/**
 * Convert an e-Sword buffer to a zip buffer ready for installMdModuleFromZip.
 *
 * @param {Buffer} buffer  — raw file bytes from multer
 * @param {string} ext     — lowercase extension: '.bblx' | '.cmtx' | '.dctx'
 * @returns {Promise<Buffer>} zip buffer
 */
export async function convertESword(buffer, ext, originalName = '') {
  // better-sqlite3 requires a file path, not a buffer.
  const tmpPath = join(tmpdir(), `esword-${randomUUID()}.db`);
  writeFileSync(tmpPath, buffer);

  let db;
  try {
    const { default: Database } = await import('better-sqlite3');
    db = new Database(tmpPath, { readonly: true, fileMustExist: true });

    const { title, abbrev, description } = readDetails(db);

    let type;
    let bookContent;    // { stem: markdownString } — for BIBLE and COMMENTARY
    let dictContent;    // string — for DICT

    try {
      if (ext === '.bblx' || ext === '.bbli') {
        type = 'BIBLE';
        assertTable(db, 'Bible', ext);
        bookContent = convertBible(db);
      } else if (ext === '.cmtx') {
        type = 'COMMENTARY';
        bookContent = convertCommentary(db);
      } else if (ext === '.dctx') {
        type = 'DICT';
        assertTable(db, 'Dictionary', ext);
        dictContent = convertDictionary(db);
      } else {
        const err = new Error(`Unsupported e-Sword extension: ${ext}`);
        err.status = 400;
        throw err;
      }
    } catch (readErr) {
      if (readErr.status) throw readErr;
      const err = new Error(
        'This e-Sword module appears to be encrypted and cannot be imported. ' +
        'Only unencrypted e-Sword modules are supported.'
      );
      err.status = 400;
      throw err;
    }

    const fileBaseName = originalName
      ? originalName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim()
      : '';
    const moduleName = title || abbrev || fileBaseName || `e-Sword ${ext.slice(1).toUpperCase()} import`;
    const sourceFile = originalName ? originalName.split('/').pop().split('\\').pop() : '';
    const moduleJson = JSON.stringify({
      name: moduleName,
      description: description || `Converted from e-Sword ${ext} file.`,
      type,
      ...(sourceFile ? { sourceFile } : {}),
    }, null, 2);

    const zip = new AdmZip();
    zip.addFile('module.json', Buffer.from(moduleJson, 'utf8'));

    if (bookContent) {
      for (const [stem, content] of Object.entries(bookContent)) {
        if (content.trim()) zip.addFile(`${stem}.md`, Buffer.from(content, 'utf8'));
      }
    }
    if (dictContent !== undefined) {
      const dictFile = type === 'BOOK' ? 'content.md' : 'dictionary.md';
      zip.addFile(dictFile, Buffer.from(dictContent, 'utf8'));
    }

    return zip.toBuffer();
  } finally {
    db?.close();
    try { unlinkSync(tmpPath); } catch {}
  }
}

// ─── Direct SQLite install (no conversion) ───────────────────────────────────

async function openDb(dbPath) {
  const { default: Database } = await import('better-sqlite3');
  return new Database(dbPath, { readonly: true, fileMustExist: true });
}

/**
 * Install a .topx SQLite file directly — no markdown conversion.
 * Creates <MD_MODULES_PATH>/<slug>/module.json and data.db.
 */
export async function installESwordDirect(buffer, ext, originalName = '') {
  const tmpPath = join(tmpdir(), `esword-${randomUUID()}.db`);
  writeFileSync(tmpPath, buffer);

  let db;
  try {
    const { default: Database } = await import('better-sqlite3');
    db = new Database(tmpPath, { readonly: true, fileMustExist: true });

    const { title, abbrev, description } = readDetails(db);
    const fileBase = originalName
      ? originalName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim()
      : '';
    const moduleName = title || abbrev || fileBase || `e-Sword ${ext.slice(1).toUpperCase()}`;

    const typeMap = { '.topx': 'BOOK' };
    const type = typeMap[ext];
    if (!type) {
      const err = new Error(`Unsupported extension for direct install: ${ext}`);
      err.status = 400;
      throw err;
    }

    let dirName = moduleName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(dirName)) dirName = `esword-${ext.slice(1)}`;

    const destDir = resolve(MD_MODULES_PATH, dirName);
    if (!destDir.startsWith(resolve(MD_MODULES_PATH) + '/')) throw new Error('Invalid module path.');

    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, 'module.json'), JSON.stringify({
      name: moduleName,
      description: description || `e-Sword ${ext.slice(1).toUpperCase()} module.`,
      type,
      format: `esword-${ext.slice(1)}`,
    }, null, 2));
    writeFileSync(join(destDir, 'data.db'), buffer);

    return `md:${dirName}`;
  } finally {
    db?.close();
    try { unlinkSync(tmpPath); } catch {}
  }
}

/** Returns all topic keys from a stored data.db. */
export async function getESwordKeys(dbPath) {
  const db = await openDb(dbPath);
  try {
    const { table, topicCol } = resolveTopicTable(db);
    return db.prepare(`SELECT \`${topicCol}\` FROM \`${table}\` ORDER BY \`${topicCol}\``)
      .all().map((r) => r[topicCol]?.trim()).filter(Boolean);
  } finally {
    db.close();
  }
}

/** Returns RTF-stripped plain text for one key. */
export async function getESwordEntry(dbPath, key) {
  const db = await openDb(dbPath);
  try {
    const { table, topicCol, noteCol } = resolveTopicTable(db);
    const row = db.prepare(
      `SELECT \`${noteCol}\` FROM \`${table}\` WHERE \`${topicCol}\` = ?`
    ).get(key);
    return row ? cleanMarkup(row[noteCol]) : null;
  } finally {
    db.close();
  }
}

/** Returns all entries as [{key, text}] with RTF stripped. */
export async function getESwordAllEntries(dbPath) {
  const db = await openDb(dbPath);
  try {
    const { table, topicCol, noteCol } = resolveTopicTable(db);
    return db.prepare(
      `SELECT \`${topicCol}\`, \`${noteCol}\` FROM \`${table}\` ORDER BY \`${topicCol}\``
    ).all()
      .map((r) => ({ key: r[topicCol]?.trim(), text: cleanMarkup(r[noteCol]) }))
      .filter((e) => e.key && e.text);
  } finally {
    db.close();
  }
}

function assertTable(db, tableName, ext) {
  const exists = db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName);
  if (!exists) {
    const err = new Error(
      `This file doesn't look like a valid e-Sword ${ext} module (no ${tableName} table found).`
    );
    err.status = 400;
    throw err;
  }
}
