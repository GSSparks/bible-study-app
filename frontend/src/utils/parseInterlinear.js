/**
 * Parses verse HTML into an array of tokens for interlinear rendering.
 * Returns: Array<{ type: 'strongs', word, strong, morph } | { type: 'text', text }>
 *
 * Walks the parsed DOM so nesting (e.g. a strongs span inside another element)
 * is handled naturally without fragile regex.
 */
export function parseVerseTokens(html) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const tokens = [];

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text) tokens.push({ type: 'text', text });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.classList.contains('strongs') && node.dataset.strong) {
        tokens.push({
          type: 'strongs',
          word: node.textContent.trim(),
          strong: node.dataset.strong,   // may be comma-separated: "G3588,G123"
          morph: node.dataset.morph || null,
        });
      } else {
        for (const child of node.childNodes) walk(child);
      }
    }
  }

  for (const child of doc.body.childNodes) walk(child);

  // Merge adjacent text tokens so punctuation runs stay together
  const merged = [];
  for (const t of tokens) {
    if (t.type === 'text' && merged.length > 0 && merged[merged.length - 1].type === 'text') {
      merged[merged.length - 1].text += t.text;
    } else {
      merged.push(t);
    }
  }
  return merged;
}

/** Collect all unique Strong's keys from an array of verse objects. */
export function collectStrongsKeys(verses) {
  const keys = new Set();
  const re = /data-strong="([^"]+)"/g;
  for (const v of verses) {
    let m;
    while ((m = re.exec(v.content)) !== null) {
      m[1].split(',').map((k) => k.trim()).filter(Boolean).forEach((k) => keys.add(k));
    }
  }
  return [...keys];
}

/** Strip "robinson:" prefix and return the first morph code in a space-separated list. */
export function cleanMorph(morph) {
  if (!morph) return null;
  return morph.split(/\s+/)[0].replace(/^[a-z]+:/i, '') || null;
}
