# frontend/src/components/BookPane.jsx

## Purpose

Prose book reader component. Fetches full book HTML content, injects anchor IDs, builds an auto-generated table of contents, re-applies persisted highlights and note markers after render, and supports text-selection color highlighting with note creation.

## Props

| Prop | Type | Description |
|---|---|---|
| `module` | string | Book module key (SWORD module name or `md:` prefixed) |
| `initialScrollY` | number | Scroll position to restore after content loads |
| `onScrollChange` | function | Called with current scrollY (debounced) for persistence |
| `auth` | object | `{ user, isLoggedIn }` |
| `onOpenBibleRef` | function | Called when user clicks a `.verse-ref` link |

## State / key logic

**Content loading:**
- Calls `api.getBookContent(module)` → raw HTML string.
- Passes through `extractToc(html)` from `utils/bookHtml.js`: injects stable `bk-*` anchor IDs on headings and `.book-section-heading` elements, returns `{ html, toc }`.
- Sets inner HTML of a `contentRef` div via `innerHTML`.

**Table of contents (TOC):**
- Desktop: sliding left sidebar, `w-52` with CSS `transition-[width]`; toggled by a TOC icon button. Active section tracked by IntersectionObserver.
- Mobile: drops from the top of the pane as a `max-h-64` collapsible panel.
- TOC items are `<a href="#bk-*">` links; clicking scrolls smoothly.

**Text selection action bar:**
- `selectionchange` listener tracks user text selection.
- On selection, a floating action bar appears via `createPortal` to `document.body`, positioned near the selection.
- Action bar shows 5 color swatches (yellow, green, blue, purple, red) plus a "note" button.
- **Highlight:** calls `api.createNote({ tags: ['book-highlight', color], reference: 'book-highlight:MODULE', quote: selectedText })`. Stored as a Note record (not the Highlight model) because book highlights need the `quote` field for text-based re-application.
- **Note:** opens a quick note composer pre-filled with the selected quote.

**Annotation re-application after load:**
- `applyHighlightsToContainer(contentRef.current, highlights)` — wraps matching text runs in colored `<mark>` spans.
- `applyNoteMarkersToContainer(contentRef.current, notes)` — inserts inline note-marker icons at text match positions with hover tooltips.
- Both utilities from `utils/bookHtml.js`; re-run whenever content or annotations change.
- Note hover tooltips rendered via `createPortal` to `document.body`.

**VerseHoverCard:**
- Attached to `mouseover` on `.verse-ref` elements within the content.
- Fetches verse text and displays a small popover card.

**Scroll persistence:**
- `scroll` event listener debounced (300ms) calls `onScrollChange(scrollY)`.
- On initial load (after `innerHTML` is set), `contentRef.current.scrollTop = initialScrollY`.

## Dependencies

- `utils/bookHtml.js` — `extractToc`, `applyHighlightsToContainer`, `applyNoteMarkersToContainer`.
- `api` (`../api/client.js`) — `getBookContent`, `listNotes` (with `prefix=book-highlight:MODULE`), `createNote`.
- `VerseHoverCard` — popover for verse references within book text.
- `createPortal` (React DOM) — selection action bar and note tooltips.

## Notes

- Book highlights are stored as `Note` records (not `Highlight` model) with `tags: ['book-highlight', color]` and `reference: 'book-highlight:MODULE'`. This is intentional — they need the `quote` field for text-based re-application since books have no verse-level anchoring.
- Re-application uses first-match text search; highlights on duplicate text passages always land on the first occurrence (known limitation).
- The `bk-*` anchor IDs injected by `extractToc` are stable across re-renders because they are based on heading text content.
- Book content for SWORD `RawGenBook` modules is a full-depth DFS concatenation of the binary tree; MD modules come from parsed Markdown files.
