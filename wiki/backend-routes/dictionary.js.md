# backend/src/routes/dictionary.js

## Purpose

Provides key listing and entry lookup for dictionary, lexicon, and general reference modules. It routes requests to the appropriate backend — Markdown modules (`md:` prefix), personal modules (`personal:` prefix), SWORD GENBOOK modules (key tree via binary index), or standard SWORD dictionary modules — returning HTML entry content in a uniform `{ key, html }` shape. Personal module access requires an authenticated session.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dictionary/:module/keys` | Returns the complete list of entry keys for the module; for Markdown BOOK-type modules returns chapter headings; for personal modules requires login; for SWORD GENBOOK modules uses the binary tree key list |
| GET | `/api/dictionary/:module/entry?key=<key>` | Returns the HTML content for a single dictionary entry; 404 if not found in Markdown or personal modules; for SWORD modules returns whatever `getRawEntry` provides |

## Auth

- SWORD and Markdown module routes are public.
- Personal module routes return HTTP 401 if the request is unauthenticated. Ownership verification is handled inside the personal module service.

## Dependencies

- `swordService` — `getDictionaryKeys`, `getRawEntry`, `getBookKeys`, `isGenBookModule`
- `personalModuleService` — `isPersonalModuleCode`, `listPersonalKeys`, `getPersonalEntryByKey`
- `mdModuleService` — `isMdModuleCode`, `mdDirName`, `getMdDictionaryKeys`, `getMdDictionaryEntry`, `getMdBookChapters`, `getMdModuleType`
