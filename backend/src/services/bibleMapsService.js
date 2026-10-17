import fs from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { toOsis } from './referenceParser.js';

const MAPS_PATH  = process.env.BIBLE_MAPS_PATH || '/data/bible-maps';
const JSON_DIR   = path.join(MAPS_PATH, 'eng', 'json');
const IMAGES_DIR = path.join(MAPS_PATH, 'eng', 'json', 'images');

// ── Numeric book-code (BBCCCVVV) → OSIS book abbreviation ─────────────────────

const BOOK_NUM_TO_OSIS = [
  null,                                                          // 0
  'Gen',  'Exod', 'Lev',    'Num',    'Deut',                  // 1–5
  'Josh', 'Judg', 'Ruth',   '1Sam',   '2Sam',                  // 6–10
  '1Kgs', '2Kgs', '1Chr',   '2Chr',   'Ezra',                  // 11–15
  'Neh',  'Esth', 'Job',    'Ps',     'Prov',                  // 16–20
  'Eccl', 'Song', 'Isa',    'Jer',    'Lam',                   // 21–25
  'Ezek', 'Dan',  'Hos',    'Joel',   'Amos',                  // 26–30
  'Obad', 'Jonah','Mic',    'Nah',    'Hab',                   // 31–35
  'Zeph', 'Hag',  'Zech',   'Mal',                             // 36–39
  'Matt', 'Mark', 'Luke',   'John',   'Acts',                  // 40–44
  'Rom',  '1Cor', '2Cor',   'Gal',    'Eph',                   // 45–49
  'Phil', 'Col',  '1Thess', '2Thess', '1Tim',                  // 50–54
  '2Tim', 'Titus','Phlm',   'Heb',    'Jas',                   // 55–59
  '1Pet', '2Pet', '1John',  '2John',  '3John',                 // 60–64
  'Jude', 'Rev',                                                // 65–66
];

function parseNumericRef(ref8) {
  if (!ref8 || ref8.length < 8) return null;
  const bookNum  = parseInt(ref8.slice(0, 2), 10);
  const chapter  = parseInt(ref8.slice(2, 5), 10);
  const verse    = parseInt(ref8.slice(5, 8), 10);
  const osisBook = BOOK_NUM_TO_OSIS[bookNum];
  if (!osisBook || !chapter) return null;
  return { osisBook, chapter, verse };
}

// ── Index ─────────────────────────────────────────────────────────────────────

let index = null;

async function buildIndex() {
  let files;
  try {
    files = await fs.readdir(JSON_DIR);
  } catch {
    index = [];
    return index;
  }

  const contentFiles = files.filter(f => /^\d+\.content\.json$/.test(f));

  const entries = await Promise.all(contentFiles.map(async (file) => {
    try {
      const raw  = JSON.parse(await fs.readFile(path.join(JSON_DIR, file), 'utf8'));
      const item = Array.isArray(raw) ? raw[0] : raw;
      if (!item?.content_id) return null;

      const refs = (item.associations?.passage ?? []).map((p) => {
        const start = parseNumericRef(p.start_ref);
        const end   = parseNumericRef(p.end_ref);
        if (!start) return null;
        const sameBook = end?.osisBook === start.osisBook;
        return {
          osisBook:     start.osisBook,
          startChapter: start.chapter,
          startVerse:   start.verse,
          endChapter:   sameBook ? end.chapter : start.chapter,
          endVerse:     sameBook ? end.verse   : start.verse,
        };
      }).filter(Boolean);

      return { id: item.content_id, title: item.title ?? '', refs };
    } catch {
      return null;
    }
  }));

  index = entries.filter(Boolean);
  return index;
}

export function invalidateIndex() { index = null; }
async function getIndex() { return index ?? buildIndex(); }

// ── Reference matching ────────────────────────────────────────────────────────

function parseQueryRef(humanRef) {
  const osis = toOsis(humanRef);
  if (!osis) return null;
  const first = osis.split(',')[0].split('-')[0];
  const parts = first.split('.');
  if (!parts[0]) return null;
  return {
    osisBook: parts[0],
    chapter:  parts[1] ? parseInt(parts[1]) : null,
    verse:    parts[2] ? parseInt(parts[2]) : null,
  };
}

function refMatches(mapRef, query) {
  if (mapRef.osisBook !== query.osisBook) return false;
  if (mapRef.startChapter == null) return true; // whole-book map

  if (query.chapter == null) return true; // book-level query

  const endCh = mapRef.endChapter ?? mapRef.startChapter;
  if (query.chapter < mapRef.startChapter || query.chapter > endCh) return false;

  if (query.verse == null) return true; // chapter-level query is within range

  if (query.chapter === mapRef.startChapter && query.chapter === endCh) {
    return query.verse >= (mapRef.startVerse ?? 1) && query.verse <= (mapRef.endVerse ?? 999);
  }
  if (query.chapter === mapRef.startChapter) return query.verse >= (mapRef.startVerse ?? 1);
  if (query.chapter === endCh)               return query.verse <= (mapRef.endVerse ?? 999);
  return true; // chapter strictly between start and end chapters
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getAllMaps() {
  return getIndex();
}

export async function findMapsForReference(humanRef) {
  const query = parseQueryRef(humanRef);
  if (!query) return [];
  const maps = await getIndex();
  return maps.filter(m => m.refs.some(r => refMatches(r, query)));
}

export function toApiShape(entry) {
  return {
    id:       entry.id,
    title:    entry.title,
    imageUrl: `/api/bible-maps/image/${entry.id}.png`,
  };
}

// ── Image serving ─────────────────────────────────────────────────────────────

export function streamImage(filename, res) {
  if (!/^(NT|OT)\d+\.png$/i.test(filename)) return false;
  const imgPath = path.join(IMAGES_DIR, filename);
  if (!existsSync(imgPath)) return false;
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=604800');
  createReadStream(imgPath).pipe(res);
  return true;
}
