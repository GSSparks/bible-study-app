# backend/src/services/eswordLibraryService.js

## Purpose

Scrapes eswordlibrary.com to support the admin module browser. Fetches the site-index page and parses `<ul class="lcp_catlist">` entries (List Category Posts plugin) into a catalog. For individual module pages it extracts Download Monitor plugin download links (`?wpdmdl=NNN`). Can then download the file (following redirects) for the install pipeline.

## Key Exports

| Export | Description |
|--------|-------------|
| `fetchCatalog()` | Fetches the site-index and returns `[{ title, url }]` (deduplicated) |
| `fetchModuleDownloadUrl(pageUrl)` | Fetches a module page and returns the download URL, or throws 404 if none found |
| `downloadModuleFile(downloadUrl, onProgress?)` | Downloads the file and returns `{ buffer, filename }` |

## Parsing Strategy

1. `parseCatalog` — finds all `<ul class="lcp_catlist">` sections (one per letter), extracts `<a href="...">` entries, deduplicates by URL.
2. `extractDownloadUrl` — checks in priority order: direct file link (`.bblx` etc.), `?wpdmdl=` link, form `action` with `?wpdmdl=`.
3. `downloadModuleFile` — follows all redirects; derives filename from `Content-Disposition` header or final URL path.

## Notable Patterns

- All network calls use `AbortSignal.timeout()` (20 s for pages, 300 s for downloads).
- Errors thrown with `.status` set so the route layer can forward them as proper HTTP error codes.
