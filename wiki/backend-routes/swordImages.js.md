# backend/src/routes/swordImages.js

## Purpose

Serves image files that are embedded within SWORD module data directories (e.g., atlas maps referenced by HTML entries in a SWORD Maps module). Resolves the physical path via the module's data directory, enforces directory-traversal protection (rejects `..` segments and absolute paths, and validates that the resolved path stays inside the SWORD data root), and streams the file with a 24-hour cache header.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sword-img?module=<moduleCode>&path=<relative-path>` | Streams an image file from the module's data directory; 400 if params are missing; 403 if the path attempts directory traversal; 404 if the module or file does not exist |

## Auth

No authentication is required.

## Dependencies

- `swordService` — `getModuleDataPath`
- `../config` — `config.swordModulesPath` (base path for the `.sword` directory)
- `node:path`, `node:fs` — path resolution and file streaming
