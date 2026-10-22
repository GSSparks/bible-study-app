# backend/src/routes/bible.js

## Purpose

Serves Bible passage text from three possible sources: standard SWORD modules (via `swordService`), Markdown modules (prefixed `md:`), and personal (user-created) commentary modules (prefixed `personal:`). It also provides a multi-translation comparison endpoint. Personal modules require an authenticated session; all other modules are publicly accessible.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bible/:module/passage?ref=<reference>` | Returns verse objects for the given reference from the specified module. Routes to the Markdown module reader, personal module reader (requires login), or SWORD reader based on the module code prefix. |
| POST | `/api/bible/compare` | Fetches the same reference from multiple modules in parallel; body: `{ modules: string[], ref: string }`; returns `{ reference, passages: { [module]: verses[] } }` |

## Auth

- SWORD and Markdown module passages are public (no auth required).
- Personal module passages return HTTP 401 if the request is unauthenticated. Ownership verification (404 on mismatch) is handled inside `getPersonalPassage`.

## Dependencies

- `swordService` — `getPassage`
- `personalModuleService` — `isPersonalModuleCode`, `getPersonalPassage`
- `mdModuleService` — `isMdModuleCode`, `mdDirName`, `getMdPassage`
