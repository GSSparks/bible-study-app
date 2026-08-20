import { marked } from 'marked';
import { prisma } from '../db/prisma.js';
import { toOsis, splitOsisSequence } from './referenceParser.js';

/**
 * Personal modules are how saved word studies and text-connected
 * conversations become browsable/searchable exactly like real installed
 * modules — a word study saved as a DICT-type entry, a conversation
 * about a passage saved as a COMMENTARY-type entry keyed by reference —
 * without needing to generate actual SWORD binary module files. There's
 * no confirmed way to *write* a SWORD module via node-sword-interface
 * (only read/install pre-built ones), and guessing at that format felt
 * like exactly the kind of unverified-SWORD-behavior mistake this
 * project has been burned by repeatedly. Instead, a personal module's
 * "module code" is `personal:<PersonalModule.id>` — recognizable by a
 * prefix — and every route that takes a module code checks for that
 * prefix and routes here instead of into swordService. The frontend
 * never needs to know the difference; it already treats "module" as an
 * opaque string everywhere.
 */

const PERSONAL_PREFIX = 'personal:';

export function isPersonalModuleCode(moduleCode) {
  return typeof moduleCode === 'string' && moduleCode.startsWith(PERSONAL_PREFIX);
}

function extractModuleId(moduleCode) {
  return moduleCode.slice(PERSONAL_PREFIX.length);
}

function toModuleCode(id) {
  return `${PERSONAL_PREFIX}${id}`;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Verifies the personal module identified by moduleCode belongs to
 *  userId, throwing a 404 (not 403) on any mismatch — same reasoning
 *  as every other ownership check in this app: a mismatch should look
 *  identical to the module simply not existing, rather than confirming
 *  to a caller that some other user's module exists at that id. This
 *  is what actually makes personal modules private, not just
 *  unlisted — without it, reading one's content by module code was
 *  still fully open to anyone who knew or guessed the id, even after
 *  it stopped showing up in that other user's module list. */
async function assertOwnsModule(moduleCode, userId) {
  const id = extractModuleId(moduleCode);
  const mod = await prisma.personalModule.findUnique({ where: { id } });
  if (!mod || mod.userId !== userId) {
    const err = new Error('Personal module not found.');
    err.status = 404;
    throw err;
  }
  return mod;
}

/** Lists personal modules of a given type in the same shape
 *  listInstalledModules() returns for real SWORD modules — `{ name,
 *  description }` — so routes/modules.js can just concatenate the two
 *  arrays and the frontend's module pickers/tab strips need no changes
 *  at all. Scoped to userId — personal modules are private per-user
 *  (confirmed explicitly), so an anonymous visitor or another user
 *  sees none of someone else's, not just an unlabeled shared list. */
export async function listPersonalModules(type, userId) {
  if (!userId) return [];
  const modules = await prisma.personalModule.findMany({ where: { type, userId }, orderBy: { createdAt: 'asc' } });
  return modules.map((m) => ({ name: toModuleCode(m.id), description: m.name }));
}

/** One default personal module per type *per user*, created the first
 *  time something is actually saved into it. Scoped by userId in both
 *  the lookup and the create — without that, every user's "My Word
 *  Studies" would collide into the same shared row despite personal
 *  modules being private, since (type, name) alone doesn't distinguish
 *  users. Keeps the initial save flow simple (no "which personal
 *  module?" picker needed yet) while the underlying schema already
 *  supports more than one per user per type, if a reason to add that
 *  picker comes up later. */
async function getOrCreateDefaultPersonalModule(type, userId) {
  const name = type === 'DICT' ? 'My Word Studies' : 'My Studies';
  const existing = await prisma.personalModule.findFirst({ where: { type, name, userId } });
  if (existing) return existing;
  return prisma.personalModule.create({ data: { type, name, userId } });
}

/** Saves a word study (type "DICT", keyed by the Strong's number) or a
 *  passage conversation (type "COMMENTARY", keyed by reference).
 *  `body` is markdown (an LLM reply, as StudyAssistant already renders
 *  it) — converted to HTML here at save time rather than at every
 *  future read, and stored that way for consistency with how every
 *  other dictionary/commentary entry in this app is already HTML by
 *  the time it reaches the frontend. */
export async function savePersonalEntry({ type, key, reference, title, body, userId }) {
  if (!userId) {
    const err = new Error('Login required to save a personal module entry.');
    err.status = 401;
    throw err;
  }
  const mod = await getOrCreateDefaultPersonalModule(type, userId);
  const html = marked.parse(body);
  const entry = await prisma.personalEntry.create({
    data: { moduleId: mod.id, key: key || null, reference: reference || null, title, body: html },
  });
  return { ...entry, moduleCode: toModuleCode(mod.id) };
}

/** DICT-type: every saved key in this personal module, for
 *  DictionaryPane's key-browse list. */
export async function listPersonalKeys(moduleCode, userId) {
  await assertOwnsModule(moduleCode, userId);
  const id = extractModuleId(moduleCode);
  const entries = await prisma.personalEntry.findMany({
    where: { moduleId: id, key: { not: null } },
    select: { key: true },
    orderBy: { key: 'asc' },
  });
  return entries.map((e) => e.key);
}

/** DICT-type: a single entry's HTML by its exact key. */
export async function getPersonalEntryByKey(moduleCode, key, userId) {
  await assertOwnsModule(moduleCode, userId);
  const id = extractModuleId(moduleCode);
  return prisma.personalEntry.findFirst({ where: { moduleId: id, key } });
}

function parseOsisPoint(point) {
  const parts = point.split('.');
  const verse = Number(parts.pop());
  const chapter = Number(parts.pop());
  const book = parts.join('.');
  return { book, chapter, verse };
}

/** Does OSIS item `a` (a point like "John.3.16" or a range like
 *  "John.3.16-John.3.18") overlap with OSIS item `b`? Verified against
 *  8 cases including range/point overlap in both directions, boundary
 *  overlap, different books, and the longest chapter in the Bible
 *  (Psalm 119, to confirm the chapter*1000+verse ordering heuristic
 *  doesn't break down there). Assumes same-book ranges throughout,
 *  matching every range this app itself ever constructs. */
function osisOverlaps(aItem, bItem) {
  const aIsRange = aItem.includes('-');
  const bIsRange = bItem.includes('-');
  const aStart = parseOsisPoint(aIsRange ? aItem.split('-')[0] : aItem);
  const aEnd = parseOsisPoint(aIsRange ? aItem.split('-')[1] : aItem);
  const bStart = parseOsisPoint(bIsRange ? bItem.split('-')[0] : bItem);
  const bEnd = parseOsisPoint(bIsRange ? bItem.split('-')[1] : bItem);
  if (aStart.book !== bStart.book) return false;
  const aStartAbs = aStart.chapter * 1000 + aStart.verse;
  const aEndAbs = aEnd.chapter * 1000 + aEnd.verse;
  const bStartAbs = bStart.chapter * 1000 + bStart.verse;
  const bEndAbs = bEnd.chapter * 1000 + bEnd.verse;
  return aStartAbs <= bEndAbs && bStartAbs <= aEndAbs;
}

/** COMMENTARY-type: every saved entry whose own reference overlaps the
 *  queried one — not an exact string match, since a conversation saved
 *  about "John 3:16-18" should still surface when focus lands on just
 *  "John 3:17", the same way a real SWORD commentary keyed for a range
 *  does. Shaped like the VerseObjects getPassage() normally returns
 *  (chapter/verseNr/content) so DictionaryPane's existing reference-mode
 *  rendering needs no changes at all — it already just maps over
 *  whatever `verses` it's handed. */
export async function getPersonalPassage(moduleCode, humanReference, userId) {
  await assertOwnsModule(moduleCode, userId);
  const id = extractModuleId(moduleCode);
  const osis = toOsis(humanReference);
  if (!osis) return [];
  const queryItems = splitOsisSequence(osis);

  const entries = await prisma.personalEntry.findMany({ where: { moduleId: id, reference: { not: null } } });

  const matches = [];
  for (const entry of entries) {
    const entryOsis = toOsis(entry.reference);
    if (!entryOsis) continue;
    const entryItems = splitOsisSequence(entryOsis);
    const overlaps = queryItems.some((q) => entryItems.some((e) => osisOverlaps(q, e)));
    if (overlaps) matches.push({ entry, entryItems });
  }

  return matches.map(({ entry, entryItems }) => {
    const firstItem = entryItems[0];
    const point = parseOsisPoint(firstItem.includes('-') ? firstItem.split('-')[0] : firstItem);
    return {
      bibleBookShortTitle: point.book,
      chapter: point.chapter,
      verseNr: point.verse,
      content: `<h4 class="mb-1 font-sans text-sm text-brass">${escapeHtml(entry.title)}</h4>${entry.body}`,
      titles: [],
    };
  });
}