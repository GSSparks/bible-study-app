# backend/src/routes/personalModulesRouter.js

## Purpose

Manages user-created personal module entries — private DICT (lexicon/word-study) and COMMENTARY entries that appear alongside installed SWORD modules in the relevant pickers. It provides a generic save endpoint for both types and a dedicated upsert path for "My Studies" personal commentary entries that are tied to a specific Bible reference. All endpoints require authentication; data is scoped to the requesting user.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/personal-modules/save` | Creates or saves a personal module entry; body: `{ type: "DICT"\|"COMMENTARY", key? (DICT), reference? (COMMENTARY), title, body }`; returns `{ status, entryId, moduleCode }` |
| GET | `/api/personal-modules/commentary-entry?reference=<ref>` | Returns the existing "My Studies" commentary entry for the given reference and the current user; 204 if none exists |
| GET | `/api/personal-modules/commentary-refs?prefix=<prefix>` | Returns all "My Studies" entry references whose reference string starts with `prefix`; used by `CommentaryPane` to build the note-indicator map for an entire chapter |
| PUT | `/api/personal-modules/commentary-entry` | Upserts a personal commentary entry for a reference; body: `{ reference, title?, bodyMd }`; creates or replaces the entry |

## Auth

`personalModulesRouter.use(requireLogin)` is applied at the router level. All endpoints require a valid session. The underlying service functions scope queries to `req.user.id`.

## Dependencies

- `personalModuleService` — `savePersonalEntry`, `getPersonalCommentaryEntry`, `upsertPersonalCommentaryEntry`, `listPersonalCommentaryEntryRefs`
