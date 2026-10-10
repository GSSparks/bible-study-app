// Common trailing phrases that add length without adding identity.
const TRAILING_FILLER = [
  /,?\s+and\s+(critical\s+)?notes?\s+on\s+the\s+(whole\s+)?bible\.?$/i,
  /,?\s+on\s+the\s+(whole\s+)?bible\.?$/i,
  /,?\s+of\s+the\s+(whole\s+)?bible\.?$/i,
  /,?\s+to\s+the\s+(whole\s+)?bible\.?$/i,
  /\s+\([\w\s,]+\)$/,
];

/**
 * Shorten a module display title to fit in a tab label.
 * Rules applied in order until the result fits within maxLen:
 *   1. Strip common trailing filler ("…and critical notes on the Bible", etc.)
 *   2. "Author's <Type>" → "Author"  (e.g. "Adam Clarke's Commentary" → "Adam Clarke")
 *   3. Truncate at the last word boundary within maxLen
 * Always supply the original as a tooltip so the full name is still accessible.
 */
export function abbreviateTitle(title, maxLen = 22) {
  if (!title || title.length <= maxLen) return title;

  let s = title.trim();

  for (const re of TRAILING_FILLER) {
    const shortened = s.replace(re, '').replace(/[,;:.]+$/, '').trim();
    if (shortened.length > 0) s = shortened;
  }
  if (s.length <= maxLen) return s;

  // "Matthew Henry's Commentary" → "Matthew Henry"
  const poss = s.match(/^(.+?)'s\s/);
  if (poss && poss[1].length <= maxLen) return poss[1];

  // Word-boundary truncation
  const cut = s.slice(0, maxLen + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return lastSpace > 0 ? s.slice(0, lastSpace) : s.slice(0, maxLen);
}
