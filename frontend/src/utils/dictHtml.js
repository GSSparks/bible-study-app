// Utility for post-processing dictionary entry HTML in the browser.

function slugify(text) {
  return text.trim().toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 60) || 'section';
}

// Lowercase, strip trailing punctuation, collapse whitespace — used to match
// TOC items to their article headings across case/punctuation differences:
//   "I. NAME AND GENEALOGY"  →  "i. name and genealogy"
//   "I. Name and Genealogy." →  "i. name and genealogy"   ← same ✓
//   "1. Shepherd"            →  "1. shepherd"
//   "1. Shepherd:"           →  "1. shepherd"             ← same ✓
function normalizeForMatch(text) {
  return text.trim()
    .toLowerCase()
    .replace(/[.,:;!?]+$/, '')
    .replace(/\s+/g, ' ');
}

// <p> whose only child is a <span> with ALL-CAPS text — ISBE roman-numeral
// TOC marker pattern: <p><span>I. NAME AND GENEALOGY</span></p>
function isCapsSpanP(el) {
  if (el.tagName !== 'P') return false;
  const kids = [...el.children];
  if (kids.length !== 1 || kids[0].tagName !== 'SPAN') return false;
  const letters = kids[0].textContent.replace(/[^a-zA-Z]/g, '');
  return letters.length > 0 && letters === letters.toUpperCase();
}

// <p> whose trimmed text starts with digits followed by a period — numbered
// sub-items in the ISBE TOC: "1. Shepherd", "14. References in the NT"
function isNumberedP(el) {
  return el.tagName === 'P' && /^\d+\./.test(el.textContent.trim());
}

/**
 * Detect an ISBE-style Table of Contents (roman-numeral entries in ALL-CAPS
 * spans at the top of the entry, followed by the same headings in mixed case
 * further down), assign anchor IDs to the article headings, and wrap the TOC
 * items as clickable scroll links.
 *
 * Handles the <entryfree> wrapper that SWORD puts around ISBE entries.
 */
export function injectTocLinks(html) {
  if (!html || typeof document === 'undefined') return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="__root">${html}</div>`, 'text/html');
  const root = doc.getElementById('__root');
  if (!root) return html;

  // SWORD wraps ISBE entries in <entryfree> (an unknown inline element).
  // Look inside it when the root has a single non-standard child.
  const STANDARD = /^(DIV|P|SECTION|ARTICLE|UL|OL|H[1-6])$/;
  const container =
    root.children.length === 1 && !STANDARD.test(root.children[0].tagName)
      ? root.children[0]
      : root;

  const allP = [...container.querySelectorAll('p')];

  // ── Step 1: verify there is an ISBE-style TOC ─────────────────────────
  // Must have at least one <p><span>ALL CAPS</span></p> element.
  const hasCapsSpan = allP.some(isCapsSpanP);
  if (!hasCapsSpan) return html;

  // ── Step 2: find the TOC boundary ─────────────────────────────────────
  // Walk forward through paragraphs. After the first caps-span appears,
  // collect caps-span and numbered items as TOC entries.
  // Stop (break) when we hit a very long content paragraph (> 400 chars) —
  // that signals the article body has started. The high threshold avoids
  // breaking on moderately-long intro lines that appear inside the TOC block.
  // "LITERATURE." appearing twice is handled by the headingMap building step
  // (which only looks after lastTocIdx).
  let lastTocIdx = -1;
  let seenCapsSpan = false;

  for (let i = 0; i < allP.length; i++) {
    const p = allP[i];
    const text = p.textContent.trim();

    if (isCapsSpanP(p)) {
      seenCapsSpan = true;
      lastTocIdx = i;
    } else if (seenCapsSpan && isNumberedP(p) && text.length < 80) {
      lastTocIdx = i;
    } else if (seenCapsSpan && text.length > 400) {
      break; // first real content paragraph — TOC is done
    }
  }

  if (lastTocIdx < 0) return html;

  // ── Step 3: collect TOC entries ────────────────────────────────────────
  const tocEntries = [];
  for (let i = 0; i <= lastTocIdx; i++) {
    const p = allP[i];
    if (isCapsSpanP(p) || isNumberedP(p)) {
      tocEntries.push({ el: p, norm: normalizeForMatch(p.textContent) });
    }
  }
  if (tocEntries.length < 2) return html;

  // ── Step 4: build a map of article headings that appear after the TOC ──
  // Key: normalized text; Value: first matching <p> after the TOC block.
  // Also registers pre-colon prefix for paragraphs like "1. Civil War: David
  // immediately removed…" so the TOC item "1. Civil War" still finds a match.
  const headingMap = new Map();
  for (let i = lastTocIdx + 1; i < allP.length; i++) {
    const p = allP[i];
    const text = p.textContent.trim();
    const norm = normalizeForMatch(text);
    if (!headingMap.has(norm)) headingMap.set(norm, p);

    const colonIdx = text.indexOf(':');
    if (colonIdx > 2 && colonIdx < 60) {
      const prefix = normalizeForMatch(text.slice(0, colonIdx));
      if (prefix.length > 2 && !headingMap.has(prefix)) headingMap.set(prefix, p);
    }
  }

  // ── Step 5: assign IDs to article headings; wrap TOC items as links ───
  const usedIds = new Set();
  let linkedCount = 0;
  let firstHeadingEl = null;
  let firstHeadingP = Infinity;

  for (const { el: tocEl, norm } of tocEntries) {
    const headingEl = headingMap.get(norm);
    if (!headingEl) continue;

    // Give the article heading an anchor ID (once, even if TOC item is repeated).
    if (!headingEl.id) {
      let base = slugify(headingEl.textContent);
      let id = base;
      let n = 1;
      while (usedIds.has(id)) id = `${base}-${n++}`;
      usedIds.add(id);
      headingEl.id = `dict-${id}`;

      const idx = allP.indexOf(headingEl);
      if (idx < firstHeadingP) {
        firstHeadingP = idx;
        firstHeadingEl = headingEl;
      }
    }

    // Replace the TOC paragraph's content with an anchor link.
    const a = doc.createElement('a');
    a.href = `#${headingEl.id}`;
    a.className = 'dict-toc-link';
    a.textContent = tocEl.textContent.trim();
    tocEl.textContent = '';
    tocEl.appendChild(a);
    linkedCount++;
  }

  // ── Step 6: visual separator before the first article heading ──────────
  if (linkedCount >= 2 && firstHeadingEl) {
    const hr = doc.createElement('hr');
    hr.className = 'dict-toc-separator';
    firstHeadingEl.parentNode.insertBefore(hr, firstHeadingEl);
  }

  return root.innerHTML;
}
