// Injects a small superscript marker after words/phrases that match a cached
// Codex entry. The word itself is left completely untouched so Strong's clicks
// and other interactions work normally. Multi-word queries are matched before
// single-word ones (longest first). Text inside <sup> elements (verse numbers,
// footnote markers, xref markers) is left untouched.
//
// In Strong's-tagged modules every word lives in its own <span>, so a phrase
// like "children of light" is three separate text nodes — a regex over a single
// text node can only see "light", not the full phrase. To handle this, each
// match is checked against a context window of surrounding text nodes: if a
// longer Codex entry's phrase exists in that combined text, the marker's
// data-query is set to the longer entry rather than the shorter one. Result:
// clicking * after "light" in "children of light" opens the phrase entry.

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const CONTEXT_WINDOW = 5; // text nodes to look at in each direction for phrase context

export function annotateCodexRefs(html, entries) {
  if (!entries || entries.length === 0 || !html) return html;

  const sorted = [...entries].sort((a, b) => b.query.length - a.query.length);
  const patterns = sorted.map((e) => escapeRegExp(e.query));
  const regex = new RegExp(`\\b(${patterns.join('|')})\\b`, 'gi');

  // Quick bail-out: avoid DOM parsing if nothing matches at all
  if (!regex.test(html)) return html;
  regex.lastIndex = 0;

  const byQuery = new Map(sorted.map((e) => [e.query.toLowerCase(), e]));

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.querySelector('div');

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let p = node.parentElement;
      while (p && p !== root) {
        if (p.tagName === 'SUP') return NodeFilter.FILTER_REJECT;
        p = p.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes = [];
  let n;
  while ((n = walker.nextNode())) textNodes.push(n);

  // Pre-build a context string for each text node position: the combined text
  // of the surrounding window. Used to detect multi-word phrase entries whose
  // words live in separate text nodes (Strong's-tagged HTML).
  const nodeContexts = textNodes.map((_, i) => {
    const start = Math.max(0, i - CONTEXT_WINDOW);
    const end = Math.min(textNodes.length, i + CONTEXT_WINDOW + 1);
    return textNodes.slice(start, end).map((t) => t.textContent).join('');
  });

  // For a matched word, return the most specific (longest) Codex entry whose
  // query appears in the surrounding context. Falls back to the directly
  // matched entry when no longer phrase is found in context.
  function bestEntry(matchedText, contextText) {
    const direct = byQuery.get(matchedText.toLowerCase());
    if (!direct) return null;
    for (const entry of sorted) {
      if (entry.query.length <= direct.query.length) break; // sorted longest-first
      if (new RegExp(`\\b${escapeRegExp(entry.query)}\\b`, 'i').test(contextText)) {
        return entry;
      }
    }
    return direct;
  }

  for (let i = 0; i < textNodes.length; i++) {
    const textNode = textNodes[i];
    const text = textNode.textContent;
    regex.lastIndex = 0;
    if (!regex.test(text)) continue;
    regex.lastIndex = 0;

    const contextText = nodeContexts[i];
    const frag = doc.createDocumentFragment();
    let last = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      frag.appendChild(doc.createTextNode(text.slice(last, m.index + m[0].length)));
      const entry = bestEntry(m[0], contextText);
      if (entry) {
        const sup = doc.createElement('sup');
        sup.className = 'codex-ref-marker';
        sup.dataset.query = entry.query;
        sup.title = `Codex: ${entry.title}`;
        sup.textContent = '*';
        frag.appendChild(sup);
      }
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(doc.createTextNode(text.slice(last)));
    textNode.parentNode.replaceChild(frag, textNode);
  }

  return root.innerHTML;
}
