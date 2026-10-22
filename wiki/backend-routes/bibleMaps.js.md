# backend/src/routes/bibleMaps.js

## Purpose

Exposes a set of endpoints for browsing and retrieving Bible map images and their metadata. Maps are indexed from a submodule on disk via `bibleMapsService`. The router supports browsing the full index, filtering maps by Bible reference, serving image files directly, and rebuilding the in-memory index on demand.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bible-maps/all` | Returns the full list of all available maps, each shaped by `toApiShape` |
| GET | `/api/bible-maps/for-reference?ref=<reference>` | Returns maps relevant to a specific Bible reference |
| GET | `/api/bible-maps/image/:filename` | Streams a PNG map image file from the submodule directory; 404 if not found |
| POST | `/api/bible-maps/reindex` | Invalidates the in-memory map index, forcing a rebuild on the next request |

## Auth

No authentication is required for any endpoint in this router.

## Dependencies

- `bibleMapsService` — `getAllMaps`, `findMapsForReference`, `streamImage`, `invalidateIndex`, `toApiShape`
