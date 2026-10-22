# frontend/src/components/LibraryView.jsx

## Purpose

PDF and document library view (always-mounted in `AppShell`). Left sidebar provides search, sort, and collection filtering. Right pane renders `DocumentReader` for the selected document.

## Props

| Prop | Type | Description |
|---|---|---|
| `isActive` | boolean | CSS visibility toggle (always-mounted pattern) |
| `auth` | object | `{ user, isLoggedIn }` |
| `pendingDocumentId` | string \| null | Nonce-based deep link to open a specific document |
| `onPendingDocumentHandled` | function | Called after deep-link document is opened |

## State / key logic

**Sidebar:**
- `searchQuery` — debounced text search against document titles, authors, and extracted text. Calls `api.searchDocuments({ q })`.
- `sortOrder` — dropdown: `newest` (default), `title`, `author`. Applied client-side to the fetched list.
- **Collection filter chips** — distinct collection names from `document.collection` field. Clicking a chip filters the list. Multiple chips allowed.
- Document list cards show: title, author, year, collection badge.

**Document reader:**
- `selectedId` — ID of the currently open document.
- `DocumentReader` is rendered with `key={selectedId}` to remount (and reset scroll) when the selected document changes.
- `pendingDocumentId` nonce watch: when AppShell receives a deep-link from another view (e.g. clicking a library-note resource in a Scriptorium), it sets `pendingDocumentId`; LibraryView picks it up, opens the document, and calls `onPendingDocumentHandled`.

**Admin upload:**
- Visible only to admins. File input (`accept=".pdf"`) submits via `FormData` POST to `/api/pdf`.
- After upload, refreshes the document list.
- Metadata fields: title, author, year, collection.

**Mobile two-panel pattern:**
- Sidebar shown when no document is selected.
- DocumentReader fills the screen when a document is selected; back button returns to sidebar.

## Dependencies

- `DocumentReader` — renders PDF content (extracted text or embedded PDF viewer).
- `api` (`../api/client.js`) — `listDocuments`, `searchDocuments`, `uploadDocument`, `deleteDocument`.

## Notes

- PDF text is extracted server-side and capped at 200K characters (stored in `Document.extractedText`).
- PDF search uses basic `ILIKE` — not yet upgraded to PostgreSQL full-text search (known limitation).
- Always-mounted: the open document and its scroll position are preserved when navigating to other views.
- Collection field is free-text; the distinct collection chips are derived dynamically from the loaded document set.
