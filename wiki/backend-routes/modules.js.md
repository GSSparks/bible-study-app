# backend/src/routes/modules.js

## Purpose

Manages SWORD and Markdown module installation, discovery, and removal. The installed-modules listing is public (it populates the module pickers used by all readers), while repository browsing, remote installation, zip upload, and deletion are admin-only. Upload and install endpoints use `requireAdmin` before the multer middleware so large file payloads are rejected before parsing for non-admin users. Auto-detection distinguishes Markdown zips (containing `module.json`) from SWORD zips at upload time.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/modules/repositories` | Lists available SWORD repositories; admin-only |
| GET | `/api/modules/available?repo=<repo>&type=<type>` | Lists modules available for installation from a repository; admin-only |
| GET | `/api/modules/installed?type=BIBLE\|COMMENTARY\|DICT\|BOOK` | Lists installed modules for the given type; visibility-filtered for non-admin users; includes personal modules for DICT/COMMENTARY types |
| POST | `/api/modules/install` | Installs a module from a SWORD repository; admin-only; body: `{ repo, moduleCode }` |
| POST | `/api/modules/upload` | Uploads a zip file and installs it as either a Markdown module or a SWORD module (auto-detected); admin-only; multipart: field `file`, max 300 MB, `.zip` only |
| DELETE | `/api/modules/:moduleCode` | Removes an installed module (Markdown or SWORD); admin-only |

## Auth

- `GET /api/modules/installed` is public.
- All other endpoints require `requireAdmin`.

## Dependencies

- `swordService` — `listRepositories`, `listAvailableModules`, `listInstalledModules`, `installModule`, `installModuleFromZip`, `removeModule`
- `personalModuleService` — `listPersonalModules`
- `moduleVisibilityService` — `filterAvailableModules`
- `mdModuleService` — `listMdModules`, `installMdModuleFromZip`, `removeMdModule`, `isMdModuleCode`, `mdDirName`
- `multer` — file upload parsing (in-memory, max 300 MB, `.zip` only)
- `adm-zip` — inspecting zip contents for auto-detection
