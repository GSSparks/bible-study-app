# backend/src/routes/factbook.js

## Purpose

The Codex feature: generates AI-powered topic overview summaries by combining dictionary entries from installed SWORD/Markdown modules with a Wikipedia extract, then caching the result in the database. On subsequent requests for the same query the cached entry is returned immediately. Module visibility filtering is applied for non-admin users. If the Anthropic API key is not configured, the endpoint returns HTTP 503.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/codex/summary?q=<query>` | Returns a cached AI-generated Markdown summary for the topic, or generates and caches one on the first request. The query must be at least 2 characters. Returns `{ ..., cached: bool }`. |

## Auth

No authentication is required. Module visibility filtering is applied based on `req.user?.role`.

## Dependencies

- `swordService` — `listInstalledModules`, `getDictionaryKeys`, `getRawEntry`
- `mdModuleService` — `isMdModuleCode`, `mdDirName`, `getMdDictionaryKeys`, `getMdDictionaryEntry`
- `moduleVisibilityService` — `filterAvailableModules`
- `factbookSummaryService` — `getCachedSummary`, `generateAndCache`
- Wikipedia REST API (external HTTP) — biased-search OpenSearch + `/page/summary` for contextual enrichment
