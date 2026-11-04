# backend/src/services/eswordLibraryService.js

## Purpose

Scrapes eswordlibrary.com to build a browseable catalog of downloadable e-Sword modules for the admin library UI, and downloads module files for the install pipeline.

## Key exports

| Export | Description |
|--------|-------------|
| `fetchCatalog()` | Fetches all 34 alphalist pages, parses `dlm-download-link` anchors, deduplicates by filename, and returns `[{ title, filename, downloadUrl, ext, type }]`. Result is cached in-process for 10 minutes. |
| `downloadModuleFile(downloadUrl, onProgress?)` | Downloads a module file (up to 300 MB), follows redirects, derives the filename from `Content-Disposition` or final URL. Returns `{ buffer, filename }`. |

## Catalog parsing

- The site exposes 34 alphalist pages (e.g. `/alphalist/a-esword-modules-authors/`), each listing multiple modules as `<a class="dlm-download-link" href="...">FILENAME.ext ...</a>` elements.
- `fetchCatalog` fetches them in batches of 6 (parallel within each batch).
- `parseAlphalistPage` regex-matches `dlm-download-link` anchors and extracts the `href` (download URL) and the first whitespace token of the inner text (filename).
- Only extensions in `SUPPORTED_EXTS` (`.bblx`, `.bbli`, `.cmtx`, `.dctx`, `.topx`, `.zip`) are kept.
- Title is derived from the filename stem by replacing dashes/underscores with spaces and title-casing.
- Type is inferred from extension (`EXT_TYPE` map); `.zip` files use `inferZipType` keyword matching.

## inferZipType

Classifies `.zip` files by filename keywords (case-insensitive, whole-word):
- COMMENTARY: `commentary`, `exposition`, `homily`, `sermons`, `annotations`
- DICT: `dictionary`, `lexicon`, `concordance`, `encyclopedia`, `thesaurus`, `glossary`
- BIBLE: `version`, `bible`, `translation`, `testament`, `septuagint`, `vulgate`, `interlinear`, `polyglot`, `scriptures`
- BOOK: default fallback

## Deduplication and caching

The same module can appear on multiple alphalist pages with different URL timestamps. `fetchCatalog` deduplicates by `filename` (keeping the first occurrence) and stores the result in a module-level variable with a 10-minute TTL so repeated admin page loads don't re-scrape the site.

## downloadModuleFile

- Validates the URL is absolute (`https://` or `http://`).
- Checks `Content-Length` header against 300 MB limit before buffering.
- Re-checks actual buffer size after download (in case `Content-Length` was absent).
- Detects HTML responses (login walls / expired links) and throws a descriptive 502 error.
- Uses a 300-second `AbortSignal.timeout`.

## Dependencies

- `fetch` / `AbortSignal.timeout` (Node 18+ built-ins)
- `Buffer` (Node built-in)
