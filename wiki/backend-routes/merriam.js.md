# backend/src/routes/merriam.js

## Purpose

Proxies lookups to the Merriam-Webster Collegiate Dictionary API and caches results in the database to avoid redundant external calls. Parses the raw MW JSON response into a structured object including headword, pronunciation, audio URL, part-of-speech groups with short definitions, etymology, first-use date, and optional illustration. Returns `null` (rather than an error) when the API key is not configured, the word is not found, or MW returns only spelling suggestions.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/merriam?q=<word>` | Looks up a word in Merriam-Webster; returns a structured entry object or `null` if not found / not configured. Results are cached in `MerriamCache` keyed by lowercased query. |

## Auth

No authentication is required.

## Dependencies

- `../db/prisma` — `MerriamCache` model for read/write caching
- Merriam-Webster Collegiate Dictionary API (external HTTP) — requires `MERRIAM_WEBSTER_API_KEY` environment variable
