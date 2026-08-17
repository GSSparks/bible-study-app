const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'as',
  'was', 'were', 'is', 'am', 'are', 'be', 'been', 'being',
  'has', 'have', 'had', 'having',
  'will', 'shall', 'would', 'should', 'could', 'can', 'may', 'might', 'must',
  'do', 'does', 'did', 'doing',
  'not', 'no',
  'his', 'her', 'its', 'their', 'our', 'your', 'my',
  'he', 'she', 'it', 'they', 'we', 'you', 'i', 'them', 'him',
]);

// Longest-first, so e.g. "ings" is tried before the shorter "ing"/"s".
const SUFFIXES = ['edly', 'ings', 'tion', 'ment', 'ing', 'ies', 'ed', 'es', 'ly', 's'];

/**
 * Turns a clicked phrase like "was baptized" into a short search term
 * more likely to substring-match a topical Bible's key list ("Baptism",
 * "Baptize", "Baptist" all share the prefix "bapti") — strips
 * auxiliary/helper words, then lightly strips one common English suffix
 * if what's left is still a reasonably short-but-meaningful word.
 *
 * Deliberately NOT a full linguistic stemmer: no attempt to reconstruct
 * irregular spelling changes (a proper stemmer would need to know
 * "baptize" softens to "baptiz" before "-ed", this just strips "-ed"
 * blindly) and no handling of irregular derivational roots at all
 * ("forgiven" doesn't reduce toward "forgive" here — though it happens
 * to already substring-match "Forgiveness" as-is, since English
 * derivational suffixes are usually added onto a shared root rather than
 * replacing letters). The result lands in an editable filter box either
 * way, so an imperfect stem is a starting point, not a dead end.
 */
export function simplifyForTopicalSearch(phrase) {
  if (!phrase) return '';
  const words = phrase
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z]/g, ''))
    .filter((w) => w && !STOPWORDS.has(w));

  // Strong's-tagged phrases are usually "helper words + one main verb/
  // noun" ("was baptized", "had believed") — the last remaining word is
  // almost always the one worth searching on.
  const core = words[words.length - 1] || phrase.trim().toLowerCase();

  for (const suf of SUFFIXES) {
    if (core.length - suf.length >= 3 && core.endsWith(suf)) {
      return core.slice(0, -suf.length);
    }
  }
  return core;
}