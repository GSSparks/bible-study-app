# backend/src/services/personalModuleService.js

## Purpose

Implements user-created personal modules — private per-user commentary and dictionary stores backed by the `PersonalModule` and `PersonalEntry` Prisma models. These allow saved word studies (type `DICT`) and saved passage conversations (type `COMMENTARY`) to appear alongside real installed SWORD modules in all pickers and panes without requiring any SWORD binary file generation. All module codes use the prefix `personal:<id>` so every routing layer can dispatch to this service rather than `swordService`.

## Key exports

- **`isPersonalModuleCode(moduleCode)`** — Returns `true` if the code starts with `"personal:"`.
- **`listPersonalModules(type, userId)`** — Returns the user's personal modules of the given type shaped as `{ name, description }` — identical to `swordService.listInstalledModules` output — so route handlers can concatenate the two arrays without special cases.
- **`savePersonalEntry({ type, key, reference, title, body, userId })`** — Creates (or places into) the user's default personal module for the given type, converting the Markdown `body` to HTML at save time. Returns the new entry plus its `moduleCode`.
- **`listPersonalKeys(moduleCode, userId)`** — Returns all saved Strong's keys for a DICT-type personal module, after verifying ownership.
- **`getPersonalEntryByKey(moduleCode, key, userId)`** — Fetches a single DICT entry by exact key, after verifying ownership.
- **`getPersonalCommentaryEntry(reference, userId)`** — Fetches an existing COMMENTARY entry from the user's "My Studies" module for the given reference, or `null`.
- **`upsertPersonalCommentaryEntry({ reference, title, bodyMd, userId })`** — Creates or updates a COMMENTARY entry for the given reference. Stores both the rendered HTML (`body`) and the original Markdown (`bodyMd`).
- **`listPersonalCommentaryEntryRefs(prefix, userId)`** — Returns an array of `reference` strings from the user's "My Studies" module where the reference starts with `prefix` (e.g. `"John 3:"`). Used by `CommentaryPane` to batch-load which verses have a personal note without fetching full entry bodies.
- **`getPersonalPassage(moduleCode, humanReference, userId)`** — Fetches COMMENTARY entries whose reference overlaps the queried reference via OSIS range overlap, returning results shaped like `swordService.getPassage` verse objects (with `bibleBookShortTitle`, `chapter`, `verseNr`, `content`).

## Dependencies

- **Prisma models:** `PersonalModule`, `PersonalEntry`
- **External libraries:** `marked` (Markdown to HTML)
- **Other services:** `referenceParser.js` (`toOsis`, `splitOsisSequence`)

## Patterns / notes

- **404 ownership masking:** `assertOwnsModule` returns 404 (not 403) when the caller's userId does not match the module's `userId`, so an attacker cannot distinguish "this module doesn't exist" from "this is someone else's module".
- **Lazy default module creation:** `getOrCreateDefaultPersonalModule` creates the default "My Word Studies" (DICT) or "My Studies" (COMMENTARY) module the first time an entry is saved, scoped by both `type` and `userId`. The schema supports multiple personal modules per user per type for future use.
- **OSIS range overlap for COMMENTARY queries:** `getPersonalPassage` implements `osisOverlaps` to match entries by reference range intersection rather than exact string equality, so a study saved against "John 3:16-18" surfaces when the reader is focused on "John 3:17".
- **Consistent verse object shape:** `getPersonalPassage` returns the same `{ bibleBookShortTitle, chapter, verseNr, content, titles }` shape as `swordService.getPassage`, so the frontend's existing pane rendering needs no changes.
- **HTML at save time:** Markdown is converted to HTML on write rather than on every read, consistent with how SWORD dictionary and commentary entries are already HTML by the time they reach the frontend.
