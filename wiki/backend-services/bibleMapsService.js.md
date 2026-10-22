# backend/src/services/bibleMapsService.js

## Purpose

Serves Bible map images and reference-based map lookups from a local directory of JSON content files and PNG images (defaulting to `/data/bible-maps/eng/json`). Each map entry is a JSON file containing passage associations encoded as 8-digit numeric references (BBCCCVVV format). The service parses these into OSIS book abbreviations, builds an in-memory index of all maps, and exposes query functions so the frontend can display contextually relevant maps for whatever passage is currently open.

## Key exports

- **`getAllMaps()`** — Returns the full in-memory index of map entries, building it from disk on first call.
- **`findMapsForReference(humanRef)`** — Parses a human-readable reference (e.g. `"John 3:16"`) via `referenceParser.toOsis`, then filters the index to maps whose passage associations overlap the query. Supports book-level, chapter-level, and verse-level queries.
- **`toApiShape(entry)`** — Converts an internal index entry to the public API shape `{ id, title, imageUrl }`, setting `imageUrl` to `/api/bible-maps/image/<id>.png`.
- **`invalidateIndex()`** — Sets the in-memory index to `null` so it will be rebuilt on the next access.
- **`streamImage(filename, res)`** — Validates the filename against a strict `(NT|OT)\d+.png` pattern, then pipes the file to the Express response with a one-week `Cache-Control` header. Returns `false` if the file does not exist or the name is invalid.

## Dependencies

- **External libraries:** `node:fs/promises`, `node:fs` (createReadStream, existsSync), `node:path`
- **Other services:** `referenceParser.js` (`toOsis`)
- **No Prisma models** — purely filesystem-based

## Patterns / notes

- **Lazy in-memory cache:** The index is built once on first access and held for the lifetime of the process. `invalidateIndex` exists for cases where the map data directory is updated at runtime without a restart.
- **Numeric reference format:** Source JSON files encode passage associations as 8-digit strings (`BBCCCVVV`). The `BOOK_NUM_TO_OSIS` lookup array maps the two-digit book number to OSIS abbreviations; the parsing logic is self-contained within this file.
- **Graceful degradation:** If the `JSON_DIR` does not exist or a content file is malformed, the index builds as an empty array rather than throwing.
- **Range overlap matching:** `refMatches` handles the full matrix of query precision (book, chapter, verse) against map range precision (whole-book, chapter range, verse range) correctly, including cross-chapter ranges.
- **Security:** `streamImage` validates the filename with a regex before constructing the file path, preventing directory traversal via the image-serving endpoint.
