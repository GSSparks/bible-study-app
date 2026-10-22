# backend/src/routes/notes.js

## Purpose

Manages user annotations: free-form notes (anchored to a Bible reference + module, or freestanding), verse-level highlights (keyed by reference + module + color), and bookmarks (saved navigation positions). All data is scoped to the logged-in user. Individual note/highlight/bookmark routes perform ownership checks and return 404 (not 403) on mismatch to prevent enumeration of other users' IDs.

## Endpoints

### Notes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notes?reference=<ref>&prefix=<prefix>&q=<text>` | Lists notes for the current user; optionally filtered by exact `reference`, by `reference` prefix (for book highlights), or by full-text `q` search across title/body/quote |
| POST | `/api/notes` | Creates a note; body: `{ title?, reference?, module?, quote?, body, tags?, fromAssistant? }`; `body` is required unless `tags` includes a highlight type |
| GET | `/api/notes/:id` | Fetches a single note; ownership-checked |
| PUT | `/api/notes/:id` | Updates a note's title, body, tags, reference, module, or quote; ownership-checked |
| DELETE | `/api/notes/:id` | Deletes a note; ownership-checked |

### Highlights

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notes/highlights?reference=<ref>&prefix=<prefix>` | Lists verse highlights for the current user, optionally filtered by reference or prefix |
| POST | `/api/notes/highlights` | Creates a verse highlight; body: `{ reference, module, color? }` |
| DELETE | `/api/notes/highlights/:id` | Deletes a verse highlight; ownership-checked |

### Bookmarks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notes/bookmarks?reference=<ref>&module=<mod>` | Lists bookmarks for the current user, optionally filtered by reference and/or module |
| POST | `/api/notes/bookmarks` | Creates a bookmark; body: `{ reference, module, label? }` |
| PUT | `/api/notes/bookmarks/:id` | Updates a bookmark's label; ownership-checked |
| DELETE | `/api/notes/bookmarks/:id` | Deletes a bookmark; ownership-checked |

## Auth

`notesRouter.use(requireLogin)` is applied at the router level. All endpoints require a valid session. Direct-by-ID access to notes, highlights, and bookmarks additionally verifies `record.userId === req.user.id`.

## Dependencies

- `../db/prisma` — direct Prisma queries for `Note`, `Highlight`, and `Bookmark` models
