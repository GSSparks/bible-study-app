# backend/src/routes/strongs.js

## Purpose

Provides a single endpoint for fetching Strong's Concordance lexicon entries by key (e.g., `G26` for Greek or `H1234` for Hebrew). It delegates to `swordService`, which reads entries from an installed Strong's SWORD module. Returns 404 for keys outside the known lexicon range, including augmented numbers (e.g., `H9002`) that exceed the original Strong's numbering.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/strongs/:key` | Returns the Strong's lexicon entry for the given key (G- or H-prefixed); 404 if no entry exists or the key is out of range |

## Auth

No authentication is required.

## Dependencies

- `swordService` — `getStrongsEntry`
