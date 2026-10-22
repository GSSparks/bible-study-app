# backend/src/routes/search.js

## Purpose

Provides a unified search endpoint that simultaneously queries Bible text (SWORD full-text search), the PDF document library, and the logged-in user's own notes. It also parses the query string to detect whether it resembles a Bible reference (e.g., "John 3" or "Romans 8:28-30"), enabling the frontend to offer a direct passage navigation shortcut alongside keyword results. The route is intentionally public (Bible text and the document library are public throughout the app), but note results are always scoped to the authenticated user when one is present.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/search?module=<mod>&q=<query>&searchType=multiWord` | Returns `{ query, reference, bible: [], total, capped, documents: [], notes: [] }`; `module` is optional — if omitted, Bible search is skipped; `searchType` defaults to `multiWord` |

## Auth

No authentication is required. Note results are conditionally included only when `req.user` is present, and are always scoped to `req.user.id`.

## Dependencies

- `swordService` — `search`
- `pdfService` — `searchDocuments`
- `referenceParser` — `parseReferenceInfo`
- `../db/prisma` — `note.findMany` for user note search
