# backend/src/routes/topics.js

## Purpose

Provides a cross-module topic search that queries all installed DICT and BOOK modules — SWORD, Markdown, and personal — simultaneously, returning matching entry keys sorted by match quality (exact match first, then starts-with, then contains). Results include the module code, description, key, and an optional `moduleType` flag for book modules. Visibility filtering is applied for non-admin users. This powers the Topics sidebar search in the UI.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/topics?q=<query>` | Searches all available DICT and BOOK modules for entries whose keys contain the query string (case-insensitive, minimum 2 characters); returns up to 15 results per module, sorted by match rank |

## Auth

No authentication is required. Visibility filtering (`filterAvailableModules`) is applied based on `req.user?.role`. Personal module keys are only returned when `req.user` is present.

## Dependencies

- `swordService` — `listInstalledModules`, `getDictionaryKeys`, `getBookKeys`
- `personalModuleService` — `isPersonalModuleCode`, `listPersonalModules`, `listPersonalKeys`
- `mdModuleService` — `isMdModuleCode`, `mdDirName`, `getMdDictionaryKeys`, `getMdModuleType`, `listMdModules`, `getMdBookChapters`
- `moduleVisibilityService` — `filterAvailableModules`
