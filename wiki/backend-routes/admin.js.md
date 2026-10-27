# backend/src/routes/admin.js

## Purpose

Provides all administrative management endpoints for the Scriptorium instance. It exposes user account management, system metrics, module visibility controls, post moderation, uploaded media management, and AI-generated codex (factbook) summary cache administration. The entire router is protected at the middleware level with `requireAdmin`, ensuring no future route added here can accidentally be left unprotected.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/metrics` | Returns database health, user metrics, and content metrics in a single response |
| GET | `/api/admin/users` | Lists all users with id, username, role, suspended, aiEnabled, createdAt, lastLoginAt |
| PATCH | `/api/admin/users/:id` | Updates a user's `role`, `suspended`, and/or `aiEnabled` fields; body: any subset of `{ role, suspended, aiEnabled }`; self-modification blocked (403) |
| DELETE | `/api/admin/users/:id` | Hard-deletes a user and all their data via Prisma cascade; self-deletion blocked (403) |
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

`adminRouter.use(requireAdmin)` is applied once at the top of the file. Every route in this file requires an admin-role session; no individual route has a separate auth check. Self-action guards (`req.params.id === req.user.id`) are applied inline in the user PATCH and DELETE handlers to prevent admins from modifying or deleting their own account.

## Dependencies

- `authService` — `listUsers`, `updateUser`, `deleteUser`
- `metricsService` — `getDbHealth`, `getUserMetrics`, `getContentMetrics`
- `moduleVisibilityService` — `listVisibilityOverrides`, `setModuleAvailability`
- `swordService` — `listInstalledModules`
- `mdModuleService` — `listMdModules`
- `factbookSummaryService` — `listAllCached`, `deleteById`
- `../middleware/upload` — `UPLOADS_PATH` (for physical file deletion)
- `../db/prisma` — direct Prisma queries for posts, users, Scriptoriums
- `adm-zip` — building the codex export ZIP
- `node:fs` — deleting physical uploaded files
