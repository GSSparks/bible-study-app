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

// David-style: <p><span>ALL CAPS TEXT</span></p>
function isCapsSpanP(el) {
  if (el.tagName !== 'P') return false;
  const kids = [...el.children];
  if (kids.length !== 1 || kids[0].tagName !== 'SPAN') return false;
  const letters = kids[0].textContent.replace(/[^a-zA-Z]/g, '');
  return letters.length > 0 && letters === letters.toUpperCase();
}

// Jerusalem-style: <p>I. ALL CAPS TEXT</p>  (Roman numeral + all-caps body)
function isRomanCapsP(el) {
  if (el.tagName !== 'P') return false;
  const t = el.textContent.trim();
  const m = t.match(/^[IVXLCDM]{1,8}\.\s+(.+)$/i);
  if (!m) return false;
  const letters = m[1].replace(/[^a-zA-Z]/g, '');
  return letters.length > 0 && letters === letters.toUpperCase();
}

// Standalone all-caps entry like "LITERATURE" at the end of an ISBE TOC.
// Only used after seenMajor is established; requires at least 3 letters,
// short length, and no Roman-numeral prefix (those are handled by isRomanCapsP).
function isAllCapsP(el) {
  if (el.tagName !== 'P') return false;
  const t = el.textContent.trim();
  if (t.length === 0 || t.length > 60) return false;
  if (/^[IVXLCDM]{1,8}\.\s/i.test(t)) return false;
  const letters = t.replace(/[^a-zA-Z]/g, '');
  return letters.length >= 3 && letters === letters.toUpperCase();
}

// Numbered sub-headings in ISBE TOCs.  Only called on <p> elements.
// Handles: "1. …"  "(1) …"  "I. …" (Roman)  "a. …"  "a) …"
function isSubHeadingP(el) {
  if (el.tagName !== 'P') return false;
  const t = el.textContent.trim();
  return (
    /^\d+\./.test(t) ||
    /^\(\d+\)/.test(t) ||
    /^[IVXLCDM]{1,8}\.\s/i.test(t) ||
    /^[a-z][.)]\s/.test(t)
  );
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
 *
 * Two entry formats are recognised:
 *   David-style   — <p><span>ALL CAPS</span></p> for major sections
 *   Jerusalem-style — <p>I. ALL CAPS TEXT</p> (Roman numeral + all-caps body)
 *
 * Article-heading search uses all block elements (p, h1-h6) because the backend
 * converts SWORD ThML <title> tags to <h3>, so section headings in the article
 * body are <h3> elements, not <p> elements.
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
  // allBlocks includes h1-h6 so that <h3> headings (produced by the backend's
  // <title>→<h3> conversion) are found during the heading-match step.
  const allBlocks = [...container.querySelectorAll('p, h1, h2, h3, h4, h5, h6')];

  // Early exit: need at least one recognised major-heading pattern.
  const hasMajor = allP.some((el) => isCapsSpanP(el) || isRomanCapsP(el));
  if (!hasMajor) return { html, toc: [] };

  // ── TOC boundary detection ─────────────────────────────────────────────────
  // Walk allBlocks so that article-body <h3> elements are visible to the
  // text-length guard.  Only <p> elements advance lastTocIdx (all detector
  // functions check el.tagName === 'P').
  let lastTocIdx = -1;
  let seenMajor = false;

  for (let i = 0; i < allBlocks.length; i++) {
    const el = allBlocks[i];
    const text = el.textContent.trim();
    if (isCapsSpanP(el) || isRomanCapsP(el)) {
      seenMajor = true;
      lastTocIdx = i;
    } else if (seenMajor && isSubHeadingP(el) && text.length < 200) {
      lastTocIdx = i;
    } else if (seenMajor && isAllCapsP(el)) {
      // e.g. "LITERATURE" at the end of major ISBE TOCs
      lastTocIdx = i;
    } else if (seenMajor && text.length > 400) {
      break;
    }
  }

  if (lastTocIdx < 0) return { html, toc: [] };

  // ── Collect TOC entries ────────────────────────────────────────────────────
  const tocEntries = [];
  for (let i = 0; i <= lastTocIdx; i++) {
    const el = allBlocks[i];
    const isMajor = isCapsSpanP(el) || isRomanCapsP(el) || isAllCapsP(el);
    const isMinor = !isMajor && isSubHeadingP(el);
    if (isMajor || isMinor) {
      tocEntries.push({ el, text: el.textContent.trim(), norm: normalizeForMatch(el.textContent), major: isMajor });
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
    for (let i = lastTocIdx + 1; i < allBlocks.length; i++) {
      const elNorm = normalizeForMatch(allBlocks[i].textContent);
      if (elNorm === norm || (elNorm.startsWith(norm) && /^[: ]/.test(elNorm[norm.length]))) {
        found = allBlocks[i];
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
      const idx = allBlocks.indexOf(found);
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
