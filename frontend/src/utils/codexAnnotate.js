// Injects a small superscript marker after words/phrases that match a cached
// Codex entry. The word itself is left completely untouched so Strong's clicks
// and other interactions work normally. Multi-word queries are matched before
// single-word ones (longest first). Text inside <sup> elements (verse numbers,
// footnote markers, xref markers) is left untouched.

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

  for (const textNode of textNodes) {
    const text = textNode.textContent;
    regex.lastIndex = 0;
    if (!regex.test(text)) continue;
    regex.lastIndex = 0;

    const frag = doc.createDocumentFragment();
    let last = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      // Emit the matched word unchanged — don't wrap it
      frag.appendChild(doc.createTextNode(text.slice(last, m.index + m[0].length)));
      // Insert a superscript marker immediately after the word
      const entry = byQuery.get(m[0].toLowerCase());
      const sup = doc.createElement('sup');
      sup.className = 'codex-ref-marker';
      sup.dataset.query = entry.query;
      sup.title = `Codex: ${entry.title}`;
      sup.textContent = '*';
      frag.appendChild(sup);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(doc.createTextNode(text.slice(last)));
    textNode.parentNode.replaceChild(frag, textNode);
  }

  return root.innerHTML;
}
