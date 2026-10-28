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

// Strips auxiliary/stopwords from a clicked phrase and returns the core word.
// For example "was baptized" → "baptized", "the covenant" → "covenant".
// The result is used as the initial query in the Codex/topical search box,
// where the user can edit it further if needed.
export function simplifyForTopicalSearch(phrase) {
  if (!phrase) return '';

  const words = phrase
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ''))
    .filter((w) => w && !STOPWORDS.has(w.toLowerCase()));

  return words[words.length - 1] || phrase.trim();
}
