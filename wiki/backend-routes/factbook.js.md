# backend/src/routes/factbook.js

## Purpose

The Codex feature: generates AI-powered topic overview summaries by combining dictionary entries from installed SWORD/Markdown modules with a Wikipedia extract, then caching the result in the database. On subsequent requests for the same query the cached entry is returned immediately. Module visibility filtering is applied for non-admin users. If the Anthropic API key is not configured, the endpoint returns HTTP 503.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/codex/summary?q=<query>` | None | Returns cached AI-generated Markdown summary for the topic, or generates and caches one on first request. Returns `{ id, title, summaryMd, summaryHtml, tags, cached: bool, ... }`. |
| PATCH | `/api/codex/summary/:id` | `requireLogin` | Updates `summaryMd` and/or `tags` on an existing cache entry. Returns the updated row with `summaryHtml`. |

## Auth

GET requires no authentication; module visibility filtering applies based on `req.user?.role`. PATCH requires `requireLogin` — any authenticated user may edit entries (Codex is instance-wide/shared).

## Dependencies

- `swordService` — `listInstalledModules`, `getDictionaryKeys`, `getRawEntry`
- `mdModuleService` — `isMdModuleCode`, `mdDirName`, `getMdDictionaryKeys`, `getMdDictionaryEntry`
- `moduleVisibilityService` — `filterAvailableModules`
- `factbookSummaryService` — `getCachedSummary`, `generateAndCache`, `updateEntry`
- `middleware/auth.js` — `requireLogin`
- Wikipedia REST API (external HTTP) — biased-search OpenSearch + `/page/summary` for contextual enrichment
