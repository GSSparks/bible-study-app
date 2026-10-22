# backend/src/routes/wikipedia.js

## Purpose

Proxies Wikipedia article lookups for use in the dictionary/topic panel. Uses the Wikipedia MediaWiki OpenSearch API to find the best-matching article title, then fetches the REST summary endpoint to retrieve a short extract and thumbnail. Returns a normalized result object or `null` on any failure (network error, article not found, API error) — never propagates external errors to the client. No caching is performed at this layer.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/wikipedia?q=<query>` | Returns `{ title, html, thumbnail, url }` for the best-matching Wikipedia article, or `null` if no match is found or an error occurs |

## Auth

No authentication is required.

## Dependencies

- Wikipedia MediaWiki API (external HTTP) — `action=query&list=search` for title resolution
- Wikipedia REST API (external HTTP) — `/api/rest_v1/page/summary/:title` for extract and thumbnail
