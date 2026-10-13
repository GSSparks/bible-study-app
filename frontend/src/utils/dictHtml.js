// Utility for post-processing dictionary entry HTML in the browser.

function slugify(text) {
  return text.trim().toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 60) || 'section';
}

function normalizeForMatch(text) {
  return text.trim()
    .toLowerCase()
    .replace(/[.,:;!?]+$/, '')
    .replace(/\s+/g, ' ');
}

function isCapsSpanP(el) {
  if (el.tagName !== 'P') return false;
  const kids = [...el.children];
  if (kids.length !== 1 || kids[0].tagName !== 'SPAN') return false;
  const letters = kids[0].textContent.replace(/[^a-zA-Z]/g, '');
  return letters.length > 0 && letters === letters.toUpperCase();
}

function isNumberedP(el) {
  return el.tagName === 'P' && /^\d+\./.test(el.textContent.trim());
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/**
 * Detect an ISBE-style Table of Contents, assign anchor IDs to article headings,
 * and return { html, toc } where:
 *   html — the processed article body (inline TOC paragraphs removed, IDs added)
 *   toc  — array of { text, id, major } for rendering as a UI component
 *
 * Returns { html: original, toc: [] } when no ISBE TOC is detected.
 */
export function injectTocLinks(html) {
  if (!html || typeof document === 'undefined') return { html, toc: [] };

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="__root">${html}</div>`, 'text/html');
  const root = doc.getElementById('__root');
  if (!root) return { html, toc: [] };

  const STANDARD = /^(DIV|P|SECTION|ARTICLE|UL|OL|H[1-6])$/;
  const container =
    root.children.length === 1 && !STANDARD.test(root.children[0].tagName)
      ? root.children[0]
      : root;

  const allP = [...container.querySelectorAll('p')];

  if (!allP.some(isCapsSpanP)) return { html, toc: [] };

  // ── TOC boundary detection ─────────────────────────────────────────────────
  let lastTocIdx = -1;
  let seenCapsSpan = false;

  for (let i = 0; i < allP.length; i++) {
    const p = allP[i];
    const text = p.textContent.trim();
    if (isCapsSpanP(p)) {
      seenCapsSpan = true;
      lastTocIdx = i;
    } else if (seenCapsSpan && isNumberedP(p) && text.length < 200) {
      lastTocIdx = i;
    } else if (seenCapsSpan && text.length > 400) {
      break;
    }
  }

  if (lastTocIdx < 0) return { html, toc: [] };

  // ── Collect TOC entries ────────────────────────────────────────────────────
  const tocEntries = [];
  for (let i = 0; i <= lastTocIdx; i++) {
    const p = allP[i];
    const isMajor = isCapsSpanP(p);
    const isMinor = !isMajor && isNumberedP(p);
    if (isMajor || isMinor) {
      tocEntries.push({ el: p, text: p.textContent.trim(), norm: normalizeForMatch(p.textContent), major: isMajor });
    }
  }
  if (tocEntries.length < 2) return { html, toc: [] };

  // ── Prefix-match each TOC entry to its article heading ────────────────────
  const usedIds = new Set();
  let firstHeadingEl = null;
  let firstHeadingIdx = Infinity;
  const matched = [];

  for (const entry of tocEntries) {
    const { norm } = entry;
    let found = null;
    for (let i = lastTocIdx + 1; i < allP.length; i++) {
      const pNorm = normalizeForMatch(allP[i].textContent);
      if (pNorm === norm || (pNorm.startsWith(norm) && /^[: ]/.test(pNorm[norm.length]))) {
        found = allP[i];
        break;
      }
    }
    if (!found) continue;

    if (!found.id) {
      let base = slugify(entry.text);
      let id = base, n = 1;
      while (usedIds.has(id)) id = `${base}-${n++}`;
      usedIds.add(id);
      found.id = `dict-${id}`;
      const idx = allP.indexOf(found);
      if (idx < firstHeadingIdx) { firstHeadingIdx = idx; firstHeadingEl = found; }
    }

    matched.push({ entry, headingEl: found });
  }

  if (matched.length < 2) return { html, toc: [] };

  // ── Remove original inline TOC paragraphs ─────────────────────────────────
  for (const { el } of tocEntries) {
    if (el.parentNode) el.remove();
  }

  // ── Hairline rule before the first article heading ─────────────────────────
  if (firstHeadingEl) {
    const hr = doc.createElement('hr');
    hr.className = 'dict-toc-separator';
    firstHeadingEl.parentNode.insertBefore(hr, firstHeadingEl);
  }

  const toc = matched.map(({ entry, headingEl }) => ({
    text: entry.major ? toTitleCase(entry.text) : entry.text,
    id: headingEl.id,
    major: entry.major,
  }));

  return { html: root.innerHTML, toc };
}
