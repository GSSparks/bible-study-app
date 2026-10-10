const BOOK_NAMES = {
  Gen: 'Genesis', Exod: 'Exodus', Lev: 'Leviticus', Num: 'Numbers',
  Deut: 'Deuteronomy', Josh: 'Joshua', Judg: 'Judges', Ruth: 'Ruth',
  '1Sam': '1 Samuel', '2Sam': '2 Samuel', '1Kgs': '1 Kings', '2Kgs': '2 Kings',
  '1Chr': '1 Chronicles', '2Chr': '2 Chronicles', Ezra: 'Ezra', Neh: 'Nehemiah',
  Esth: 'Esther', Job: 'Job', Ps: 'Psalm', Prov: 'Proverbs', Eccl: 'Ecclesiastes',
  Song: 'Song of Solomon', Isa: 'Isaiah', Jer: 'Jeremiah', Lam: 'Lamentations',
  Ezek: 'Ezekiel', Dan: 'Daniel', Hos: 'Hosea', Joel: 'Joel', Amos: 'Amos',
  Obad: 'Obadiah', Jonah: 'Jonah', Mic: 'Micah', Nah: 'Nahum', Hab: 'Habakkuk',
  Zeph: 'Zephaniah', Hag: 'Haggai', Zech: 'Zechariah', Mal: 'Malachi',
  Matt: 'Matthew', Mark: 'Mark', Luke: 'Luke', John: 'John', Acts: 'Acts',
  Rom: 'Romans', '1Cor': '1 Corinthians', '2Cor': '2 Corinthians', Gal: 'Galatians',
  Eph: 'Ephesians', Phil: 'Philippians', Col: 'Colossians',
  '1Thess': '1 Thessalonians', '2Thess': '2 Thessalonians',
  '1Tim': '1 Timothy', '2Tim': '2 Timothy', Titus: 'Titus', Phlm: 'Philemon',
  Heb: 'Hebrews', Jas: 'James', '1Pet': '1 Peter', '2Pet': '2 Peter',
  '1John': '1 John', '2John': '2 John', '3John': '3 John', Jude: 'Jude', Rev: 'Revelation',
};

function parsePoint(point) {
  const parts = point.split('.');
  return { book: parts[0], chapter: parts[1], verse: parts[2] };
}

function bookName(code) {
  return BOOK_NAMES[code] || code;
}

/** Converts a single OSIS point or range to a human-readable reference.
 *  "John.3.16"               → "John 3:16"
 *  "Matt.5.1-Matt.5.12"      → "Matt 5:1-12"
 *  "Matt.5.1-Matt.6.2"       → "Matt 5:1–6:2"
 *  "John.3.16-Acts.1.1"      → "John 3:16–Acts 1:1"
 */
export function osisToHuman(osis) {
  if (!osis) return osis;
  const dash = osis.indexOf('-');
  if (dash === -1) {
    const { book, chapter, verse } = parsePoint(osis);
    if (!chapter) return bookName(book);
    if (!verse) return `${bookName(book)} ${chapter}`;
    return `${bookName(book)} ${chapter}:${verse}`;
  }

  const start = parsePoint(osis.slice(0, dash));
  const end = parsePoint(osis.slice(dash + 1));

  const startStr = `${bookName(start.book)} ${start.chapter}:${start.verse}`;

  if (start.book === end.book && start.chapter === end.chapter) {
    return `${startStr}–${end.verse}`;
  }
  if (start.book === end.book) {
    return `${startStr}–${end.chapter}:${end.verse}`;
  }
  return `${startStr}–${bookName(end.book)} ${end.chapter}:${end.verse}`;
}
