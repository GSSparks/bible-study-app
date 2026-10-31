# backend/src/routes/eswordLibrary.js

## Purpose

Provides admin-only endpoints for browsing eswordlibrary.com and installing modules from it directly. Fetches and parses the site-index page to produce a searchable catalog, then handles async installation via an SSE job pattern identical to `modules.js`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/esword-library/catalog` | Fetches and parses the eswordlibrary.com site-index; returns `[{ title, url }]` |
| POST | `/api/esword-library/install` | Starts an async install from a module page URL; body: `{ pageUrl }`; returns `{ jobId }` |
| GET | `/api/esword-library/install/progress/:jobId` | SSE stream; events: `progress` `{ message }`, `complete` `{ moduleCode }`, `job-error` `{ message }` |

## Auth

All endpoints require `requireAdmin`.

## Dependencies

- `eswordLibraryService` — `fetchCatalog`, `fetchModuleDownloadUrl`, `downloadModuleFile`
- `eSwordService` — `convertESword`, `installESwordDirect`
- `mdModuleService` — `installMdModuleFromZip`
- `swordService` — `installModuleFromZip`
- `adm-zip` — SWORD/MD zip auto-detection
