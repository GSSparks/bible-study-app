# backend/src/services/mdModuleService.js

## Purpose

Implements "Markdown modules" — a lightweight alternative to compiled SWORD modules that lets admins add commentaries, dictionaries, Bible texts, and prose books by dropping a directory of Markdown (or CCEL ThML XML) files under `MD_MODULES_PATH`. This service handles discovery, reading, parsing, and installation/removal of those modules. All module codes it produces are prefixed `md:` so every part of the application can route to this service instead of `swordService` when it sees that prefix.

## Key exports

- **`isMdModuleCode(code)`** — Returns `true` if the code starts with `"md:"`.
- **`mdDirName(code)`** — Strips the `md:` prefix to get the directory name.
- **`listMdModules(type)`** — Scans `MD_MODULES_PATH` for subdirectories containing a valid `module.json`, optionally filtering by type (`BIBLE`, `COMMENTARY`, `DICT`, `BOOK`). Returns objects shaped like `swordService.listInstalledModules` results.
- **`getMdPassage(moduleDirName, ref)`** — Parses a human reference, finds the correct book file (by normalized filename matching), parses `## chapter:verse` sections, and returns verse-shaped objects. Falls back to a `## chapter` heading if no per-verse section matches.
- **`getMdDictionaryKeys(moduleDirName)`** — Returns a sorted list of all `## Heading` keys across all `.md` files in a DICT module directory.
- **`getMdDictionaryEntry(moduleDirName, key)`** — Looks up a dictionary entry by case-insensitive key match, first trying a slug-named individual file then scanning all `.md` files for a `## section` match.
- **`getMdBookChapters(moduleDirName)`** — Returns an ordered list of chapter/section keys for a BOOK module. For ThML XML files, extracts `<h1>`/`<h2>` heading texts; for Markdown files, returns `## section` keys in document order.
- **`getMdBookChapterContent(dirName, key)`** — Returns the HTML content for a named chapter/section: for ThML, extracts the HTML segment between matching headings; for Markdown, returns the content of the matching `## section`.
- **`getMdFullBookContent(dirName)`** — Returns the full HTML of a BOOK module: parses ThML XML via `parseThml` if an `.xml` file exists, otherwise concatenates all `.md` files rendered to HTML.
- **`getMdModuleType(moduleDirName)`** — Reads `module.json` and returns the `type` field.
- **`mdVersesToText(verses)`** — Strips HTML tags from verse objects' `content` for plain-text use in AI context.
- **`installMdModuleFromZip(buffer)`** — Extracts a zip buffer into `MD_MODULES_PATH`, accepting both flat and single-wrapper-directory zip layouts. Validates `module.json`, determines the directory name, guards against path traversal, and returns the installed module code.
- **`removeMdModule(dirName)`** — Deletes a module directory after verifying it is a direct child of `MD_MODULES_PATH`.

## Dependencies

- **External libraries:** `fs/promises`, `path`, `marked` (Markdown to HTML), `adm-zip` (zip extraction)
- **No Prisma models** — purely filesystem-based

## Patterns / notes

- **ThML parsing (`parseThml`):** An internal function that converts CCEL ThML XML to display HTML. `<div1>`/`<div2>` become plain `<section>`/`<div>` wrappers; the existing `<h1>`–`<h3>` child elements are left untouched (the `title=""` attribute is intentionally ignored to avoid duplicate headings). `<scripRef>` elements become clickable `<span class="verse-ref">` spans. ThML-specific tags like `<insertIndex>` and `<l>` are also handled.
- **Verse shape consistency:** `getMdPassage` returns objects with the same fields (`bibleBookShortTitle`, `chapter`, `verseNr`, `absoluteVerseNr`, `content`, `titles`) as `swordService.getPassage`, so all downstream consumers work identically.
- **Path traversal guards:** `installMdModuleFromZip` validates the directory name with a regex and resolves the destination path against `MD_MODULES_PATH` before writing any files. Individual entry paths are also checked.
- **Book file matching:** `readBookFile` does exact-then-prefix matching between the normalized reference book name and `.md` filenames, tolerating common abbreviation mismatches (e.g. `"Gen"` finds `"genesis.md"`).
