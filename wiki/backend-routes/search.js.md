# backend/src/routes/search.js

## Purpose

Provides search endpoints covering Bible text, PDF documents, user notes, study discussions, and commentary modules. The main endpoint simultaneously queries SWORD full-text search, the PDF library, and the logged-in user's own notes and study discussions. It also parses the query string to detect whether it resembles a Bible reference, enabling the frontend to offer a direct passage navigation shortcut alongside keyword results. A separate commentary search endpoint fans out across all installed commentary modules (SWORD and Markdown).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/search?module=<mod>&q=<query>&searchType=multiWord` | Returns `{ query, reference, bible: [], total, capped, documents: [], notes: [], discussions: [] }`; `module` is optional — if omitted, Bible search is skipped; `searchType` defaults to `multiWord` |
| GET | `/api/search/commentary?q=<query>[&module=<code>]` | Full-text search across commentary modules. If `module` is given, searches only that module; otherwise fans out across all installed SWORD and Markdown commentaries with `Promise.allSettled`. Caps at 200 total results (50 per module). Returns `[{ module, moduleTitle, reference, snippet }]` |

## Auth

No authentication is required for either endpoint. Note and discussion results on the main search route are conditionally included only when `req.user` is present, scoped to `req.user.id`.

## Dependencies

- `swordService` — `search` (used by both endpoints)
- `pdfService` — `searchDocuments`
- `referenceParser` — `parseReferenceInfo`
- `mdModuleService` — `listMdModules`, `searchMdCommentary`
- `../db/prisma` — `note.findMany` and `studyPost.findMany` for user-scoped results

## Notes

- Commentary fan-out uses `Promise.allSettled` so a single failing module does not abort results from others.
- The SWORD `search()` method is serialized internally via a mutex (`_searchLock` in `swordService`) to prevent the `"Module search in progress"` error when multiple concurrent commentary searches are in flight.
- `discussions` in the main search result are `StudyPost` records from studies the user participates in — only populated when logged in.
