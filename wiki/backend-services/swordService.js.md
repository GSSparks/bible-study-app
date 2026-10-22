# backend/src/services/swordService.js

## Purpose

The central wrapper around `node-sword-interface` (NodeSwordInterface), which itself wraps the CrossWire SWORD C++ library. All Bible text, commentary, dictionary, devotional, and general book content passes through this service. It handles passage fetching with chapter caching, SWORD HTML post-processing (Strong's markup normalization, cross-reference collapse, footnotes, verse-reference detection), full-Bible index building for word and phrase studies, binary GenBook tree parsing, module installation and removal, and text search. A singleton `swordService` instance is exported for use throughout the backend.

## Key exports (selected)

**Module management**
- **`listRepositories()`** — Returns available remote repository names after ensuring repo config is loaded.
- **`listAvailableModules(repoName, moduleType)`** — Lists installable modules from a repo; maps internal `'BOOK'` type to SWORD's `'GENBOOK'` filter string.
- **`listInstalledModules(moduleType)`** — Lists locally installed modules; uses `_detectBookModules` for the BOOK type since SWORD does not filter GenBook modules reliably.
- **`listDevotionalModules()`** — Scans installed COMMENTARY/DICT/BOOK modules for devotional-keyword descriptions or names.
- **`installModule(repoName, moduleCode, onProgress)`** — Installs a module from a remote repo with a progress callback.
- **`removeModule(moduleCode)`** — Uninstalls a module.
- **`installModuleFromZip(buffer)`** — Extracts a SWORD zip package directly into the `.sword` directory, with a path-traversal guard.

**Passage fetching**
- **`getPassage(moduleCode, humanReference)`** — Parses the reference to OSIS, iterates over sequence items, fetches chapters (cached within a call), filters to the requested verse range, and runs every verse through `processVerseContent`. Returns an array of verse objects with processed `content` and extracted `titles`.

**HTML post-processing pipeline**
- **`processVerseContent(html, currentBookOsis)`** — Runs the full processing pipeline: `flattenBlockTags` → `stripMilestones` → `extractTitles` → `normalizeCrossReferenceNotes` → `normalizeFootnoteMarkup` → `linkStrongsCrossReferences` → `normalizeStrongsMarkup` → `expandScriprefAbbreviations` → `wrapVerseReferences` → `linkBareScripRefs`.
- **`processDictEntryContent(html)`** — Like `processVerseContent` but preserves block structure (`<div>` → `<p>` rather than `<span>`), converts `<hi>` and `<title>` tags, and does not flatten block tags.
- **`processDevotionalContent(html)`** — Preserves paragraph structure for devotional entries, converts `<hi>` formatting, and normalizes footnotes and verse references.
- **`processDictHyperlinks(html)`** — Converts all `<a>` hyperlinks in dictionary entries to data-attribute spans: Strong's links become `<span class="strongs">`, Vine's cross-refs become `<span class="dict-entry-ref">`, `sword://` URIs are mapped to the appropriate span type, and all other links are stripped (text kept).
- **`rewriteImageSrcs(html, moduleCode)`** — Rewrites relative `<img src>` attributes to `/api/sword-data/...` paths, probing three possible disk locations (module DataPath, parent, `.sword` root).
- **`versesToText(verses)`** — Returns `"verseNr content"` pairs as a plain-text string (strips HTML).

**Dictionaries and books**
- **`getDictionaryKeys(moduleCode)`** / **`getRawEntry(moduleCode, key)`** / **`getBookEntry(moduleCode, key)`**
- **`getStrongsEntry(strongsKey)`** — Fetches a Strong's dictionary entry.
- **`getDictModuleKeys(moduleCode)`** — Returns all keys in a DICT module.
- **`isGenBookModule(moduleCode)`** — Returns `true` if the module's `type` is `"Generic Books"`.
- **`getBookKeys(moduleCode)`** — Parses the GenBook binary name tree and returns all section paths.
- **`getFullBookContent(moduleCode)`** — DFS-traverses the binary tree and concatenates all node content as HTML.

**Full-Bible indexing for word/phrase study**
- **`buildModuleIndex(moduleCode)`** — Scans all ~1,189 chapters of a Bible module once, building a `Map(strongsKey → occurrences[])` and a flat verse array with plain text and per-word Strong's key sequences. Yields every 20 chapters to avoid blocking the event loop. Concurrent requests for the same not-yet-indexed module share one build promise.
- **`getStrongsOccurrences(moduleCode, strongsKey)`** — Returns all occurrences of a Strong's key from the cached index.
- **`findPhraseOccurrences(moduleCode, phrase)`** — Case-insensitive substring search against the plain-text verse cache.
- **`findStrongsSequenceOccurrences(moduleCode, querySequence)`** — Finds verses containing a consecutive run of Strong's-tagged words in the same order.

**Search**
- **`search(moduleCode, term, { searchType, searchScope, limit })`** — Calls SWORD's `getModuleSearchResults` and processes each result's content through `processVerseContent`.

## Dependencies

- **External libraries:** `node-sword-interface`, `adm-zip`, `node:path`, `node:fs`
- **Other services:** `referenceParser.js` (`toOsis`, `splitOsisSequence`, `isRange`, `findReferencesInText`), `config.js` (`swordModulesPath`)

## Patterns / notes

- **Singleton export:** `export const swordService = new SwordService()` — one instance for the lifetime of the process.
- **Chapter cache per `getPassage` call:** A `Map` local to each `getPassage` invocation prevents redundant `getChapterText` calls when a range spans multiple verses in the same chapter.
- **`enableMarkup()` at construction:** Called once in the constructor to enable Strong's word-click HTML output. Failures are warned but not thrown, degrading gracefully.
- **Full-Bible index deduplication:** `_moduleIndexBuilding` stores in-flight build promises so concurrent requests share one scan; `_moduleIndexCache` stores completed results for the process lifetime.
- **Binary GenBook parsing:** `_parseBntTree` reads the SWORD `TreeKeyIdx` binary format (6 × INT32LE header per record, null-terminated name) by byte-offset navigation. `_concatAllContent` does a DFS traversal reading content from the companion `.bdt` data file. Both `.bnt` (modern) and `.dat` (legacy) formats are handled.
- **`replaceBalancedSpans`:** A shared utility that finds `<span>` elements by class token and replaces their full content (correctly tracking depth for nested spans), used by title extraction, cross-reference normalization, footnote normalization, and abbreviation expansion.
- **`wrapVerseReferences` HTML safety:** After locating reference matches with `findReferencesInText`, the method filters out any match whose start or end position falls inside an existing HTML tag, preventing double-wrapping.
