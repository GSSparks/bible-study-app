# frontend/src/utils/bookHtml.js

**Purpose**

Post-processing utilities for book content HTML rendered in `BookPane`. Provides three distinct capabilities: TOC extraction (scanning headings and injecting stable anchor IDs), text-based highlight re-application (wrapping saved quote text in `<mark>` elements), and note marker insertion (adding inline superscript dots after quoted text, with tooltip hover). All three are needed because book content is rendered as raw HTML whose structure cannot be directly controlled by React's virtual DOM.

**Key exports / contents**

- `extractToc(html)` — parses HTML via `DOMParser`, finds all `h1`–`h4` and `.book-section-heading` elements, injects stable `bk-*` anchor IDs (deduplicating collisions), and returns `{ html: string, toc: Array<{ text, id, level }> }`. Returns `{ html, toc: [] }` when fewer than 2 headings are found. Also marks short `<p>` elements immediately following non-h1 headings with class `book-epigraph` (for scripture mottoes in 19th-century works).
- `BOOK_HIGHLIGHT_COLORS` — object with four color keys (`yellow`, `green`, `blue`, `pink`), each having `{ bg: string, label: string }` where `bg` is an RGBA CSS string. Used as the authoritative color palette for book highlights across the app.
- `applyNoteMarkersToContainer(container, notes)` — walks the DOM tree of a mounted container and inserts a `<span class="book-note-marker">` bullet dot after the first occurrence of each note's `quote` text. Notes without a quote or body are skipped. Errors during DOM mutation (e.g., cross-element ranges) are silently caught.
- `applyHighlightsToContainer(container, highlights)` — walks the DOM tree and wraps the first occurrence of each highlight's `quote` text in a `<mark>` element with inline `background` from `BOOK_HIGHLIGHT_COLORS`. Cross-element ranges (where `surroundContents` would throw) are silently skipped.

**Dependencies / relationships**

- No imports.
- `extractToc` is called in `BookPane.jsx` after content is fetched and before rendering, to build the TOC sidebar.
- `applyHighlightsToContainer` and `applyNoteMarkersToContainer` are called in `BookPane.jsx` inside a `useEffect` after the content renders into the DOM.
- `BOOK_HIGHLIGHT_COLORS` is imported by `BookPane.jsx` and potentially by color picker UI components.
- Tested in `frontend/src/__tests__/utils/bookHtml.test.js`.

**Notes**

- All three functions require a real DOM environment (`document`); `extractToc` guards with `typeof document === 'undefined'` for SSR safety.
- Highlight re-application uses first-match only — highlights on duplicate text passages always apply to the first occurrence. This is a known limitation documented in `CLAUDE.md`.
- `applyNoteMarkersToContainer` uses a `TreeWalker` (not `innerHTML` manipulation) to safely traverse text nodes without destroying the existing DOM structure.
- Book highlights are stored as `Note` records (not `Highlight` records) in the database; see `CLAUDE.md` for the distinction.
