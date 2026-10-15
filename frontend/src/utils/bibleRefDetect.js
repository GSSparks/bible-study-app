// Detect Bible references in plain text extracted from PDF pages.
// Returns a deduplicated array of { display, ref } where:
//   display — canonical "Book Chapter:Verse" form shown in the sidebar
//   ref     — same string, used to navigate in Cell

const BOOKS = [
  // Old Testament
  { name: 'Genesis', abbrevs: ['Genesis', 'Gen', 'Gn'] },
  { name: 'Exodus', abbrevs: ['Exodus', 'Exod', 'Exo', 'Ex'] },
  { name: 'Leviticus', abbrevs: ['Leviticus', 'Lev', 'Le', 'Lv'] },
  { name: 'Numbers', abbrevs: ['Numbers', 'Num', 'Nu', 'Nm', 'Nb'] },
  { name: 'Deuteronomy', abbrevs: ['Deuteronomy', 'Deut', 'Dt'] },
  { name: 'Joshua', abbrevs: ['Joshua', 'Josh', 'Jos'] },
  { name: 'Judges', abbrevs: ['Judges', 'Judg', 'Jdg', 'Jg', 'Jgs'] },
  { name: 'Ruth', abbrevs: ['Ruth', 'Rth', 'Ru'] },
  { name: '1 Samuel', abbrevs: ['1 Samuel', '1Samuel', '1 Sam', '1Sam', '1 Sa', '1Sa', 'I Sam', 'I Samuel'] },
  { name: '2 Samuel', abbrevs: ['2 Samuel', '2Samuel', '2 Sam', '2Sam', '2 Sa', '2Sa', 'II Sam', 'II Samuel'] },
  { name: '1 Kings', abbrevs: ['1 Kings', '1Kings', '1 Kgs', '1Kgs', '1 Ki', '1Ki', 'I Kings', 'I Kgs'] },
  { name: '2 Kings', abbrevs: ['2 Kings', '2Kings', '2 Kgs', '2Kgs', '2 Ki', '2Ki', 'II Kings', 'II Kgs'] },
  { name: '1 Chronicles', abbrevs: ['1 Chronicles', '1Chronicles', '1 Chr', '1Chr', '1 Ch', '1Ch', 'I Chr', 'I Chronicles'] },
  { name: '2 Chronicles', abbrevs: ['2 Chronicles', '2Chronicles', '2 Chr', '2Chr', '2 Ch', '2Ch', 'II Chr', 'II Chronicles'] },
  { name: 'Ezra', abbrevs: ['Ezra', 'Ezr'] },
  { name: 'Nehemiah', abbrevs: ['Nehemiah', 'Neh', 'Ne'] },
  { name: 'Esther', abbrevs: ['Esther', 'Esth', 'Est', 'Es'] },
  { name: 'Job', abbrevs: ['Job', 'Jb'] },
  { name: 'Psalm', abbrevs: ['Psalms', 'Psalm', 'Psa', 'Ps'] },
  { name: 'Proverbs', abbrevs: ['Proverbs', 'Prov', 'Pro', 'Prv'] },
  { name: 'Ecclesiastes', abbrevs: ['Ecclesiastes', 'Eccles', 'Eccle', 'Eccl', 'Ec'] },
  { name: 'Song of Solomon', abbrevs: ['Song of Solomon', 'Song of Songs', 'Song of Sol', 'Canticles', 'Song', 'Cant'] },
  { name: 'Isaiah', abbrevs: ['Isaiah', 'Isa', 'Is'] },
  { name: 'Jeremiah', abbrevs: ['Jeremiah', 'Jer', 'Je', 'Jr'] },
  { name: 'Lamentations', abbrevs: ['Lamentations', 'Lam', 'La'] },
  { name: 'Ezekiel', abbrevs: ['Ezekiel', 'Ezek', 'Eze', 'Ezk'] },
  { name: 'Daniel', abbrevs: ['Daniel', 'Dan', 'Da', 'Dn'] },
  { name: 'Hosea', abbrevs: ['Hosea', 'Hos', 'Ho'] },
  { name: 'Joel', abbrevs: ['Joel', 'Jl'] },
  { name: 'Amos', abbrevs: ['Amos', 'Am'] },
  { name: 'Obadiah', abbrevs: ['Obadiah', 'Obad', 'Ob'] },
  { name: 'Jonah', abbrevs: ['Jonah', 'Jon', 'Jnh'] },
  { name: 'Micah', abbrevs: ['Micah', 'Mic', 'Mc'] },
  { name: 'Nahum', abbrevs: ['Nahum', 'Nah', 'Na'] },
  { name: 'Habakkuk', abbrevs: ['Habakkuk', 'Hab', 'Hb'] },
  { name: 'Zephaniah', abbrevs: ['Zephaniah', 'Zeph', 'Zep', 'Zp'] },
  { name: 'Haggai', abbrevs: ['Haggai', 'Hag', 'Hg'] },
  { name: 'Zechariah', abbrevs: ['Zechariah', 'Zech', 'Zec', 'Zc'] },
  { name: 'Malachi', abbrevs: ['Malachi', 'Mal', 'Ml'] },
  // New Testament
  { name: 'Matthew', abbrevs: ['Matthew', 'Matt', 'Mat', 'Mt'] },
  { name: 'Mark', abbrevs: ['Mark', 'Mk', 'Mr'] },
  { name: 'Luke', abbrevs: ['Luke', 'Lk', 'Lu'] },
  { name: 'John', abbrevs: ['John', 'Joh', 'Jn'] },
  { name: 'Acts', abbrevs: ['Acts', 'Ac'] },
  { name: 'Romans', abbrevs: ['Romans', 'Rom', 'Ro', 'Rm'] },
  { name: '1 Corinthians', abbrevs: ['1 Corinthians', '1Corinthians', '1 Cor', '1Cor', '1 Co', 'I Cor', 'I Corinthians'] },
  { name: '2 Corinthians', abbrevs: ['2 Corinthians', '2Corinthians', '2 Cor', '2Cor', '2 Co', 'II Cor', 'II Corinthians'] },
  { name: 'Galatians', abbrevs: ['Galatians', 'Gal', 'Ga'] },
  { name: 'Ephesians', abbrevs: ['Ephesians', 'Eph', 'Ep'] },
  { name: 'Philippians', abbrevs: ['Philippians', 'Phil', 'Php', 'Pp'] },
  { name: 'Colossians', abbrevs: ['Colossians', 'Col'] },
  { name: '1 Thessalonians', abbrevs: ['1 Thessalonians', '1Thessalonians', '1 Thess', '1Thess', '1 Th', 'I Thess', 'I Thessalonians'] },
  { name: '2 Thessalonians', abbrevs: ['2 Thessalonians', '2Thessalonians', '2 Thess', '2Thess', '2 Th', 'II Thess', 'II Thessalonians'] },
  { name: '1 Timothy', abbrevs: ['1 Timothy', '1Timothy', '1 Tim', '1Tim', '1 Ti', 'I Tim', 'I Timothy'] },
  { name: '2 Timothy', abbrevs: ['2 Timothy', '2Timothy', '2 Tim', '2Tim', '2 Ti', 'II Tim', 'II Timothy'] },
  { name: 'Titus', abbrevs: ['Titus', 'Tit'] },
  { name: 'Philemon', abbrevs: ['Philemon', 'Phlm', 'Philem', 'Phm'] },
  { name: 'Hebrews', abbrevs: ['Hebrews', 'Heb', 'He'] },
  { name: 'James', abbrevs: ['James', 'Jas', 'Jm', 'Jms'] },
  { name: '1 Peter', abbrevs: ['1 Peter', '1Peter', '1 Pet', '1Pet', '1 Pe', 'I Pet', 'I Peter'] },
  { name: '2 Peter', abbrevs: ['2 Peter', '2Peter', '2 Pet', '2Pet', '2 Pe', 'II Pet', 'II Peter'] },
  { name: '1 John', abbrevs: ['1 John', '1John', '1 Jn', '1Jn', 'I John', 'I Jn'] },
  { name: '2 John', abbrevs: ['2 John', '2John', '2 Jn', '2Jn', 'II John', 'II Jn'] },
  { name: '3 John', abbrevs: ['3 John', '3John', '3 Jn', '3Jn', 'III John', 'III Jn'] },
  { name: 'Jude', abbrevs: ['Jude', 'Jud'] },
  { name: 'Revelation', abbrevs: ['Revelation', 'Revelations', 'Rev', 'Rv', 'Apoc'] },
];

// Canonical lookup: any form (lowercased) → canonical book name
const ABBREV_TO_NAME = new Map();
for (const book of BOOKS) {
  ABBREV_TO_NAME.set(book.name.toLowerCase(), book.name);
  for (const a of book.abbrevs) ABBREV_TO_NAME.set(a.toLowerCase(), book.name);
}

// Build alternation sorted longest-first so multi-word forms ("Song of Solomon")
// are tried before their shorter subsets ("Song").
const ALL_FORMS = BOOKS.flatMap((b) => [b.name, ...b.abbrevs])
  .sort((a, b) => b.length - a.length);

const ESCAPED = ALL_FORMS.map((s) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\s+/g, '\\s+')
);

// Pattern: BOOK (optional period) whitespace CHAPTER (:VERSE (-ENDVERSE)?)?
// The trailing \b prevents "John 3:16something" from matching verse "16something".
const REF_RE = new RegExp(
  `\\b(${ESCAPED.join('|')})\\.?\\s+(\\d{1,3})(?::(\\d{1,3})(?:[–—\\-](\\d{1,3}))?)?\\b`,
  'g'
);

export function detectBibleRefs(text) {
  if (!text) return [];
  const seen = new Set();
  const results = [];
  REF_RE.lastIndex = 0;
  let m;
  while ((m = REF_RE.exec(text)) !== null) {
    const canonical = ABBREV_TO_NAME.get(m[1].toLowerCase());
    if (!canonical) continue;
    const chapter = m[2];
    const verse = m[3];
    const endVerse = m[4];
    const display = verse
      ? `${canonical} ${chapter}:${verse}${endVerse ? `–${endVerse}` : ''}`
      : `${canonical} ${chapter}`;
    if (!seen.has(display)) {
      seen.add(display);
      results.push({ display, ref: display });
    }
  }
  return results;
}
