# frontend/src/utils/dictHtml.js

**Purpose**

Post-processes dictionary entry HTML to detect and extract ISBE-style inline tables of contents (common in large Bible dictionaries like the International Standard Bible Encyclopedia). When a TOC is found, its inline paragraph elements are removed from the article body, stable anchor IDs are injected into the corresponding article section headings, and a hairline `<hr>` rule is inserted before the first heading — enabling a structured side-nav UI to be rendered alongside the article.

**Key exports / contents**

- `injectTocLinks(html)` — main export; returns `{ html: string, toc: Array<{ text, id, major }> }`.
  - Returns `{ html: original, toc: [] }` when no ISBE TOC pattern is detected.
  - `major: true` entries are title-cased; `major: false` entries preserve their original casing.
  - Heading IDs are prefixed with `dict-` and deduplicated with a numeric suffix.
  - Removes the original inline TOC `<p>` elements and inserts a `.dict-toc-separator` `<hr>` before the first matched article heading.
- Internal helpers (not exported): `slugify`, `normalizeForMatch`, `isCapsSpanP`, `isRomanCapsP`, `isAllCapsP`, `isSubHeadingP`, `toTitleCase`.

**Dependencies / relationships**

- No imports.
- Consumed by `DictionaryPane.jsx` (or similar) after fetching a dictionary entry, to build a structured TOC nav component alongside the article text.
- Works in a browser DOM environment via `DOMParser`.

**Notes**

- Two TOC heading patterns are recognized:
  - **David-style** — `<p><span>ALL CAPS TEXT</span></p>` (e.g., the "David" article in ISBE).
  - **Jerusalem-style** — `<p>I. ALL CAPS TEXT</p>` (Roman numeral + all-caps body).
- Sub-headings (`1. …`, `(1) …`, `I. …`, `a. …`) are detected after a major heading is established and added as minor TOC entries.
- The TOC boundary is detected by finding the last consecutive block that looks like a TOC entry; a block with `> 400` characters ends the TOC scan (article body text is too long to be a TOC entry).
- Article heading matching uses prefix normalization (trimmed, lowercased, trailing punctuation stripped) so minor formatting differences between the TOC text and the actual heading don't cause misses.
- The function inspects both `<p>` and `<h1>`–`<h6>` elements in `allBlocks` because the SWORD ThML backend converts `<title>` tags to `<h3>`, making section headings appear as heading elements rather than paragraphs.
