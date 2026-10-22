# frontend/src/__tests__/utils/bookHtml.test.js

**Purpose**

Unit tests for `frontend/src/utils/bookHtml.js`, covering both the `BOOK_HIGHLIGHT_COLORS` constant and the `extractToc` function. Verifies color palette shape, TOC extraction edge cases, heading-level assignment, anchor ID injection and deduplication, preservation of pre-existing IDs, and the modified HTML output.

**Key exports / contents**

No exports — test file only. Test suites:

- **BOOK_HIGHLIGHT_COLORS** — verifies exactly 4 keys (`yellow`, `green`, `blue`, `pink`), each with a non-empty `bg` string and a non-empty `label` string; verifies each color's specific label value.

- **extractToc** — comprehensive edge-case coverage:
  - Empty string, null, and undefined inputs return `{ html, toc: [] }`.
  - Fewer than 2 headings returns `toc: []`.
  - 2+ headings returns a populated toc array.
  - Each toc entry has `text`, `id`, and `level` properties.
  - `h1` → level 1, `h2` → level 2, `h3` → level 3, `h4` → level 4.
  - `h3.book-section-heading` → level 3.
  - Injected IDs start with `"bk-"`.
  - Pre-existing IDs are preserved, not overwritten.
  - Duplicate heading text produces unique IDs.
  - Modified HTML string contains the injected `id="bk-..."` attributes.
  - Single valid heading (after empty-text filtering) results in `toc: []`.
  - TOC entry `text` matches the heading's text content.

**Dependencies / relationships**

- `vitest` — `describe`, `it`, `expect`.
- `../../utils/bookHtml.js` — the module under test (`BOOK_HIGHLIGHT_COLORS` and `extractToc`).
- Runs in the jsdom environment (required because `extractToc` uses `DOMParser` and `document`).

**Notes**

- The jsdom environment provided by `vitest.config.js` makes `DOMParser` and `document.getElementById` available, which `extractToc` requires.
- `applyHighlightsToContainer` and `applyNoteMarkersToContainer` are not tested here — they require a live DOM container with rendered content and are better tested as integration tests or with component tests.
- The test for "only 1 heading survives filtering" documents the behavior that an empty `<h1>` is skipped, leaving only one valid heading, which results in an empty TOC.
