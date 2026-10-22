# frontend/src/components/PDFBody.jsx

## Purpose

PDF rendering body used inside `DocumentReader`. Renders one page at a time via `react-pdf` (PDF.js wrapper), with zoom controls, pinch-to-zoom on mobile, arrow-key page navigation, and a fit-width button. Provides a full annotation system on top of the PDF text layer: highlight selection by color, sticky notes on selected text, and remove-highlight by clicking an existing highlight. Also shows a right sidebar listing Bible references detected on the current page. Includes a bookmark system (per-page labels), an in-PDF search panel, and a native PDF table of contents (when present).

## Props

| Prop | Type | Description |
|---|---|---|
| `documentId` | string | Document ID (used for API calls and file URL) |
| `doc` | object | Document metadata object (for filename, extractedText) |
| `isAdmin` | bool | Enables OCR trigger in sidebar |
| `isLoggedIn` | bool | Enables annotations and bookmarks |
| `onOcr` | func | Called to trigger OCR on the document |
| `ocrRunning` | bool | Shows "Running…" state in OCR button |
| `ocrError` | string | Error from OCR attempt |
| `onOpenInCell` | func | `(ref) => void` — open a Bible reference in Cell from the sidebar |

## State / Key Logic

- **Page/zoom**: `pageNumber`, `scale` (default 1.2), `numPages`, `nativePageWidth`. `fitWidth` computes scale from the container width and native page width.
- **PDF TOC**: Loaded via `pdfDoc.getOutline()` on document load. `TocEntry` renders recursive items with expand/collapse. `navigateTocItem` resolves named destinations to page numbers via PDF.js `getDestination`/`getPageIndex`.
- **Annotations**: Stored as `Note` records with `reference: 'pdf-highlight:${documentId}'`, `module: String(pageNumber)`, `tags: ['pdf-highlight', colorId]`, and `quote` for text. Highlights are applied to the PDF.js text layer via `applyHighlightsToTextLayer` — a span-level character-position overlap algorithm that normalises whitespace differences between stored quotes and rendered spans. Both an immediate apply and a MutationObserver debounce (200 ms) are used to handle PDF.js's incremental span insertion.
- **Search**: `buildPageIndex` lazily builds a `Map<pageNum, string>` by extracting all page text content from the PDF.js document. Debounced 300 ms after input. Results list shows page number + snippet with match highlighted. `applySearchToTextLayer` uses `box-shadow` CSS (non-conflicting with highlight `backgroundColor`).
- **Bookmarks**: Stored via `api.createBookmark`/`api.updateBookmark`/`api.deleteBookmark` with `reference: 'pdf-bookmark:${documentId}'`. Inline label editing with a ref-focused input.
- **Bible reference sidebar**: `detectBibleRefs` is called via `onGetTextSuccess` on each page render, populating `pageRefs`. The sidebar is always visible on desktop, toggled by a button on mobile.
- **Pinch-to-zoom**: Touch event listeners on the scroll area with `passive: false` on `touchmove` to prevent browser scroll interference.
- **Annotation toolbar**: Appears above selected text; color swatches trigger `saveHighlight`, "Note" button switches to the note editor mode.
- **Remove highlight**: Clicking a span with `data-pdf-hl` shows a "Remove" popup.

## Dependencies

- `react-pdf` (`Document`, `Page`, `pdfjs`)
- `api.listNotes`, `api.createNote`, `api.deleteNote`, `api.listBookmarks`, `api.createBookmark`, `api.updateBookmark`, `api.deleteBookmark`, `api.documentFileUrl`
- `BOOK_HIGHLIGHT_COLORS` from `utils/bookHtml.js`
- `detectBibleRefs` from `utils/bibleRefDetect.js`

## Notes

- `pdfjs.GlobalWorkerOptions.workerSrc` is set via `new URL(...)` to use Vite's asset handling for the PDF.js worker.
- The `scaleRef` is kept in sync with `scale` state so the pinch handler closure always reads the current scale without a stale closure.
- `pageTextsRef` is a ref (not state) to avoid re-renders on each page of the search index build.
- The MutationObserver has a 10-second auto-disconnect bail to prevent memory leaks if PDF.js never finishes.
