# backend/src/routes/admin.js

## Purpose

Provides all administrative management endpoints for the Scriptorium instance. It exposes system metrics, module visibility controls, post moderation, uploaded media management, and AI-generated codex (factbook) summary cache administration. The entire router is protected at the middleware level with `requireAdmin`, ensuring no future route added here can accidentally be left unprotected.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/metrics` | Returns database health, user metrics, and content metrics in a single response |
| GET | `/api/admin/modules/visibility?type=BIBLE\|COMMENTARY\|DICT\|DAILY` | Lists all installed SWORD and Markdown modules of the given type merged with their current visibility state; modules with no explicit override default to `availableToUsers: true` |
| POST | `/api/admin/modules/:moduleCode/visibility` | Sets `availableToUsers` (boolean) for a specific module; body: `{ availableToUsers: bool }` |
| GET | `/api/admin/posts` | Lists the 200 most recent posts across all users, newest first, including author info and comment count |
| DELETE | `/api/admin/posts/:id` | Permanently removes any post by ID |
| GET | `/api/admin/media` | Returns all DB-referenced uploaded files (user avatars, user banners, Scriptorium banners, post media) |
| DELETE | `/api/admin/media` | Deletes a physical uploaded file and clears its DB reference; body: `{ type, ownerId, url }` |
| GET | `/api/admin/codex` | Lists all cached AI-generated topic summary entries |
| DELETE | `/api/admin/codex/:id` | Removes a cached summary by ID, forcing re-generation on the next request |
| GET | `/api/admin/codex/export` | Downloads all cached summaries as a zip archive containing a `module.json` and `entries.md` formatted as a DICT Markdown module |

## Auth

`adminRouter.use(requireAdmin)` is applied once at the top of the file. Every route in this file requires an admin-role session; no individual route has a separate auth check.

## Dependencies

- `metricsService` — `getDbHealth`, `getUserMetrics`, `getContentMetrics`
- `moduleVisibilityService` — `listVisibilityOverrides`, `setModuleAvailability`
- `swordService` — `listInstalledModules`
- `mdModuleService` — `listMdModules`
- `factbookSummaryService` — `listAllCached`, `deleteById`
- `../middleware/upload` — `UPLOADS_PATH` (for physical file deletion)
- `../db/prisma` — direct Prisma queries for posts, users, Scriptoriums
- `adm-zip` — building the codex export ZIP
- `node:fs` — deleting physical uploaded files
