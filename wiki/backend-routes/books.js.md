# backend/src/routes/books.js

## Purpose

Provides access to prose book (General Book / GENBOOK) modules, supporting both SWORD and Markdown (`md:`) module sources. It exposes module discovery, key-tree navigation, full-book HTML content, and individual chapter/entry lookup. Module visibility filtering is applied for non-admin users.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/books/installed` | Lists all installed BOOK modules (SWORD + Markdown); visibility-filtered for non-admin users |
| GET | `/api/books/:module/keys` | Returns the full binary-tree key list for a SWORD GENBOOK module (not used for Markdown modules) |
| GET | `/api/books/:module/content` | Returns the complete HTML content of the book as a single concatenated string; supports both Markdown (`getMdFullBookContent`) and SWORD (`getFullBookContent`) modules |
| GET | `/api/books/:module/entry?key=<key>` | Returns the HTML for a single named chapter/entry; 404 if the chapter is not found in a Markdown module |

## Auth

No authentication is required for any endpoint. Visibility filtering (`filterAvailableModules`) is applied based on `req.user?.role`.

## Dependencies

- `swordService` — `listInstalledModules`, `getBookKeys`, `getFullBookContent`, `getBookEntry`
- `moduleVisibilityService` — `filterAvailableModules`
- `mdModuleService` — `listMdModules`, `isMdModuleCode`, `mdDirName`, `getMdFullBookContent`, `getMdBookChapterContent`
