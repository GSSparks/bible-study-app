# backend/src/services/eSwordService.js

## Purpose

Converts e-Sword SQLite module files (`.bblx`, `.bbli`, `.cmtx`, `.dctx`) into MD-module zip buffers ready for `installMdModuleFromZip`, and directly installs `.topx` topic-note files as live-query MD modules. Also exposes query functions used by `mdModuleService` to read from `.topx` data files at runtime without re-conversion.

## Key exports

| Export | Description |
|--------|-------------|
| `ESWORD_EXTS` | `Set<string>` of supported extensions: `.bblx`, `.bbli`, `.cmtx`, `.dctx`, `.topx` |
| `convertESword(buffer, ext, originalName?)` | Converts an e-Sword buffer to a zip buffer. Detects type from extension, converts content, writes `module.json` + per-book `.md` files or `dictionary.md`, returns zip `Buffer`. Throws `{ status: 400 }` on encrypted or invalid files. |
| `installESwordDirect(buffer, ext, originalName?)` | For `.topx` files: writes `module.json` + `data.db` directly to `MD_MODULES_PATH` instead of converting. Returns the installed `md:dirName` code. |
| `getESwordKeys(dbPath)` | Returns all topic/key strings from a stored `.topx` data.db. Used by `mdModuleService.getMdDictionaryKeys`. |
| `getESwordEntry(dbPath, key)` | Returns RTF-stripped text for one key. Used by `mdModuleService.getMdDictionaryEntry`. |
| `getESwordAllEntries(dbPath)` | Returns `[{ key, text }]` for all entries. Used by `mdModuleService` when rendering the full book content of a `.topx` module. |

## Conversion pipeline (convertESword)

1. Write buffer to a temp file (better-sqlite3 requires a file path).
2. Open with better-sqlite3 in read-only mode.
3. Read `Details` table for title/abbreviation/description.
4. Wrap content read in a try/catch — if any read fails, throw "encrypted" 400 error. Encryption is detected by read failure, not by checking for a `sqliteplus_license` table (which appears in all modern e-Sword files).
5. For `.bblx`/`.bbli`: assert `Bible` table exists, call `convertBible`.
6. For `.cmtx`: call `convertCommentary` (handles both `Commentary` single-column and `Verses`/`Chapters`/`Books` range schema).
7. For `.dctx`: assert `Dictionary` table exists, call `convertDictionary`.
8. Build `module.json` including a `sourceFile` field (original filename) so the admin library UI can match catalog entries to installed modules.
9. Add per-book `.md` files (Bible/Commentary) or `dictionary.md` (Dict) to the zip and return it.

## Direct install pipeline (installESwordDirect)

Used for `.topx` topic-note files. Rather than converting to static Markdown, installs `data.db` directly alongside `module.json` (with `format: "esword-topx"`). `mdModuleService` detects this format flag and queries the SQLite at read time via the `getESword*` functions.

## resolveTopicTable

`.topx` files from different e-Sword versions use different table and column names. `resolveTopicTable` probes candidate table names (`TopicNotes`, `Topic`, `Notes`, `Topics`) and column names (`Topic`/`Name`/`Title`…, `Note`/`Notes`/`Definition`…) and returns the first matching combination. Reports a diagnostic error listing actual column names if no match is found.

## Dependencies

- `better-sqlite3` (dynamic import — keeps it optional at startup)
- `adm-zip` (zip assembly)
- `node:fs`, `node:os`, `node:path`, `node:crypto` (temp file lifecycle)
