// Post-processing utilities for book content HTML.

function slugify(text) {
  return text.trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'section';
}

/**
 * Scan book HTML for headings (h1–h4, .book-section-heading), inject
 * stable anchor IDs, and return a TOC array.  Works even when no
 * explicit table of contents exists in the source.
 */
export function extractToc(html) {
  if (!html || typeof document === 'undefined') return { html, toc: [] };

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="__root">${html}</div>`, 'text/html');
  const root = doc.getElementById('__root');
  if (!root) return { html, toc: [] };

  const headings = [...root.querySelectorAll('h1, h2, h3, h4, .book-section-heading')];
  if (headings.length < 2) return { html, toc: [] };

  const usedIds = new Set();
  const toc = [];

  for (const el of headings) {
    const text = el.textContent.trim();
    if (!text || text.length > 200) continue;

    if (!el.id) {
      const base = slugify(text);
      let id = `bk-${base}`;
      let n = 1;
      while (usedIds.has(id)) id = `bk-${base}-${n++}`;
      usedIds.add(id);
      el.id = id;
    } else {
      usedIds.add(el.id);
    }

    const tag = el.tagName.toLowerCase();
    const level =
      tag === 'h1' ? 1
      : tag === 'h2' ? 2
      : tag === 'h3' || el.classList.contains('book-section-heading') ? 3
      : 4;

    toc.push({ text, id: el.id, level });

    // Mark the immediately following <p> as an epigraph when it is short
    // (< 200 chars) — this catches scripture citations and chapter mottoes
    // that directly follow a heading in 19th-century theological works.
    // h1 epigraphs are skipped: a short <p> after the book title is more
    // likely a subtitle or author line, which already renders fine.
    if (tag !== 'h1') {
      const next = el.nextElementSibling;
      if (next && next.tagName === 'P' && next.textContent.trim().length < 200) {
        next.classList.add('book-epigraph');
      }
    }
  }

  if (toc.length < 2) return { html, toc: [] };

  return { html: root.innerHTML, toc };
}

export const BOOK_HIGHLIGHT_COLORS = {
  yellow: { bg: 'rgba(254, 240, 138, 0.55)', label: 'Yellow' },
  green:  { bg: 'rgba(134, 239, 172, 0.55)', label: 'Green' },
  blue:   { bg: 'rgba(147, 197, 253, 0.55)', label: 'Blue' },
  pink:   { bg: 'rgba(249, 168, 212, 0.55)', label: 'Pink' },
};

/**
 * Insert a small inline marker after the first occurrence of a note's
 * quoted text.  The marker is a tiny superscript dot; hovering reveals
 * the note body in a tooltip.  Notes without a quote are skipped.
 */
export function applyNoteMarkersToContainer(container, notes) {
  if (!container || !notes?.length) return;

  for (const note of notes) {
    if (!note.quote || !note.body?.trim()) continue;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const idx = node.textContent.indexOf(note.quote);
      if (idx === -1) continue;
      try {
        // Split at the END of the match so the marker follows the quote.
        const after = node.splitText(idx + note.quote.length);
        const marker = document.createElement('span');
        marker.className = 'book-note-marker';
        marker.dataset.noteId = note.id;
        marker.setAttribute('title', note.body); // native tooltip as fallback
        marker.innerHTML = '&#8226;'; // bullet dot
        after.parentNode.insertBefore(marker, after);
      } catch {
        // DOM mutation mid-walk can throw — skip
      }
      break;
    }
  }
}

/**
 * Re-apply stored highlights to a rendered container by text-matching
 * the saved quote.  Skips any quote that spans multiple DOM elements
 * (surroundContents would throw) — those highlights are simply not
 * re-drawn rather than crashing the page.
 */
export function applyHighlightsToContainer(container, highlights) {
  if (!container || !highlights?.length) return;

  for (const hl of highlights) {
    const quote = hl.quote;
    if (!quote) continue;
    const color = hl.tags?.find((t) => BOOK_HIGHLIGHT_COLORS[t]) || 'yellow';
    const bg = BOOK_HIGHLIGHT_COLORS[color]?.bg ?? BOOK_HIGHLIGHT_COLORS.yellow.bg;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const idx = node.textContent.indexOf(quote);
      if (idx === -1) continue;
      try {
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + quote.length);
        const mark = document.createElement('mark');
        mark.dataset.highlightId = hl.id;
        mark.style.cssText = `background:${bg};border-radius:2px;`;
        range.surroundContents(mark);
      } catch {
        // cross-element range — skip silently
      }
      break;
    }
  }
}
