# frontend/src/components/DocumentPane.jsx

## Purpose

A list-and-open panel for the document library, used as a pane type within the Cell window system. Shows all documents with a search box (debounced 300 ms, hitting `api.searchDocuments`), and opens any document in a `DocumentModal` overlay when clicked.

## Props

| Prop | Type | Description |
|---|---|---|
| `isLoggedIn` | bool | Passed through to `DocumentModal` for "Ask AI" feature gating |
| `isAdmin` | bool | Passed through to `DocumentModal` for admin controls |
| `onAskAI` | func | `(documentId) => void` — passed through to `DocumentModal` |

## State / Key Logic

- `docs` — loaded from `api.listDocuments()` on mount.
- `search` — controlled input. Debounced 300 ms to `api.searchDocuments`. `searchResults` is `null` (no search active) or an array. `displayDocs` is `searchResults ?? docs`.
- `openDocId` — when set, renders `DocumentModal`. On delete, clears `openDocId` and refreshes the list. On rename, merges the updated document into `docs`.

## Dependencies

- `DocumentModal`
- `api.listDocuments`, `api.searchDocuments`

## Notes

- `searchResults === null` is the sentinel for "no active search" (as opposed to empty search results), which correctly shows the full list rather than "no matches".
- The pane does not render a document reader directly — it delegates entirely to `DocumentModal` for the reader experience.
