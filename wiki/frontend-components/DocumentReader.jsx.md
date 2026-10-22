# frontend/src/components/DocumentReader.jsx

## Purpose

Full-featured document reader for uploaded PDF and Word/text documents. Handles both file types: for PDFs it delegates to `PDFBody`; for other files it renders extracted text as structured heading+paragraph blocks with in-page search highlighting and a table of contents panel. Provides admin actions (rename with author/collection fields, delete with confirmation, OCR trigger). The extracted text is parsed into blocks with automatic heading detection to produce a navigable TOC.

## Props

| Prop | Type | Description |
|---|---|---|
| `documentId` | string | Document ID to load |
| `isLoggedIn` | bool | Enables "Ask AI" button |
| `isAdmin` | bool | Enables rename, delete, OCR buttons |
| `onAskAI` | func | `(documentId) => void` — trigger AI chat about the document |
| `onOpenInCell` | func | `(ref) => void` — open a Bible reference in Cell (passed to PDFBody) |
| `onClose` | func | Close/dismiss the reader |
| `onDeleted` | func | `(documentId) => void` — called after delete |
| `onRenamed` | func | `(updatedDoc) => void` — called after rename |
| `collections` | string[] | Existing collection names for datalist autocomplete |

## State / Key Logic

- `doc` — fetched via `api.getDocument(documentId)` on mount and on `documentId` change.
- `isPdf` / `isWordDoc` — detected from `doc.filename` extension.
- `blocks` — computed from `doc.extractedText` via `parseBlocks(text, isWordDoc)`. Word docs treat each non-empty line as a block; PDFs do blank-line paragraph splitting with a second-pass merge for wrapped lines (lines ending without terminal punctuation followed by a lowercase-start line are rejoined).
- `detectHeadingLevel` — returns 1, 2, or 0. Detects `Chapter N`, `Part N`, `PREFACE`, all-caps short lines, and numbered headings. Used to build the TOC and render `h2`/`h3` elements.
- `tocItems` — derived from `blocks` filtered to `level > 0`; `slugify` assigns stable `anchorId` values.
- **Search**: `Ctrl+F` focuses the search input. `matchCount` is recalculated on query/text change. The `Highlighted` helper splits text on query terms and wraps matches in `<mark>`.
- **TOC**: Toggled by the "Contents" button; `scrollToBlock` uses the body ref's `scrollTo` for smooth anchor navigation.
- **Rename**: Inline form in the header with title, author, and collection fields. `collections` prop provides a `<datalist>` for collection autocomplete.
- **Delete**: Two-step confirmation inline in the header.
- **OCR**: `api.ocrDocument(documentId)` replaces the document object with the updated version including extracted text.

## Dependencies

- `PDFBody` (for PDF rendering)
- `api.getDocument`, `api.updateDocument`, `api.deleteDocument`, `api.ocrDocument`, `api.documentFileUrl`

## Notes

- The block parser has a second-pass PDF-line-merge heuristic: many PDFs produce one paragraph per hard-wrapped line rather than blank-line-delimited paragraphs; the heuristic detects and rejoins these.
- Extracted text is capped at 200,000 characters on import; a note appears at the bottom when the cap was reached.
- `useMemo` on `parseBlocks` and `tocItems` avoids re-parsing on every render.
