import pkg from 'bible-passage-reference-parser/cjs/en_bcv_parser.js';

const { bcv_parser } = pkg;

// A fresh parser per call would re-pay setup cost; a shared instance is fine
// since .parse() doesn't hold state between calls.
const bcv = new bcv_parser();

// Force every reference to verse-level precision, even bare books/chapters
// ("John 3" -> "John.3.1-John.3.36", "Jude" -> "Jude.1.1-Jude.1.25"). This
// means downstream code never has to special-case "is this a whole chapter"
// vs "is this a single verse" — everything is either a single "Book.C.V"
// point or a "Book.C.V-Book.C.V" range, which is what
// getReferencesFromReferenceRange / getVersesFromReferences expect anyway.
bcv.set_options({
  osis_compaction_strategy: 'bcv',
  book_alone_strategy: 'full', // bare book name ("Psalms") -> the whole book
});

/**
 * Converts a human-typed reference into a verse-precise OSIS string.
 * Supports single verses, ranges, whole chapters, whole books, and
 * comma-separated sequences ("John 3:16, Romans 8:28-30").
 * Returns null if the input isn't recognized as a reference at all.
 */
export function toOsis(humanReference) {
  const osis = bcv.parse(humanReference).osis();
  return osis || null;
}

/**
 * Splits a (possibly comma-separated) OSIS string into its component
 * items, e.g. "John.3.16-John.3.18,Rom.8.28" -> ["John.3.16-John.3.18", "Rom.8.28"].
 */
export function splitOsisSequence(osis) {
  return osis.split(',');
}

/** True if a single OSIS item is a range ("Book.C.V-Book.C.V") rather than a single point. */
export function isRange(osisItem) {
  return osisItem.includes('-');
}

/** Lightweight check used by the search UI to offer a "go to passage" jump. */
export function parseReferenceInfo(humanInput) {
  const osis = toOsis(humanInput);
  return { valid: Boolean(osis), osis };
}

// A second parser instance, configured differently from the one above:
// this one is for *finding* references embedded in running prose (e.g.
// commentary text), where we don't want a bare mention of "the Gospel of
// John" to be treated as a jumpable reference — only actual chapter:verse
// citations should get wrapped as clickable links.
const detectionBcv = new bcv_parser();
detectionBcv.set_options({
  osis_compaction_strategy: 'bcv',
  book_alone_strategy: 'ignore',
});

/**
 * Finds Bible references embedded in a longer piece of text (e.g. "cf.
 * John 3:16 and Romans 8:28-30") and returns each one's OSIS key plus
 * its exact character offsets in the original string, so a caller can
 * wrap just those substrings without disturbing anything else —
 * including any HTML markup already in the string, as long as the
 * reference text itself isn't split across a tag boundary.
 */
export function findReferencesInText(text) {
  const parsed = detectionBcv.parse(text).parsed_entities();
  const matches = [];
  for (const group of parsed) {
    for (const entity of group.entities || []) {
      if (entity.osis && entity.indices) {
        matches.push({ osis: entity.osis, start: entity.indices[0], end: entity.indices[1] });
      }
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}
