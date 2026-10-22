# backend/src/services/factbookSummaryService.js

## Purpose

Powers the Codex (Factbook) feature, which generates and caches AI-written summaries for biblical topics, people, places, and themes. When a user looks up a topic, the route layer assembles available context (dictionary entries from installed SWORD/Markdown modules, optional Wikipedia extracts) and passes it here. This service either returns a cached summary or calls Claude to generate a new one, converts the Markdown response to HTML with clickable Bible references and related-topic links, and persists the result in the `FactbookCache` table.

## Key exports

- **`getCachedSummary(normalizedQuery)`** — Looks up a normalized query string in `FactbookCache`. If found, runs the stored Markdown through `toHtml` (Markdown → HTML + verse-ref span injection + topic-link conversion) and returns the augmented row.
- **`generateAndCache(title, normalizedQuery, { dictEntries, wikipediaExtract })`** — Calls the Anthropic API with a structured system prompt instructing it to write a 3–5 paragraph biblical reference summary with a `## Related Topics` section. Upserts the result into `FactbookCache` and returns the augmented row with `summaryHtml`.
- **`listAllCached()`** — Returns all `FactbookCache` rows ordered by creation date, for an admin cache-management view.
- **`deleteById(id)`** — Deletes a single cached entry so it can be regenerated on the next request.

## Dependencies

- **Prisma models:** `FactbookCache`
- **External libraries/APIs:** `@anthropic-ai/sdk` (Claude API), `marked` (Markdown-to-HTML)
- **Other services:** `referenceParser.js` (`findReferencesInText`)

## Patterns / notes

- **Custom protocol links:** The AI is prompted to emit related topics as `[Label](factbook:Query)` Markdown links. `preprocessTopicRefs` converts these to `<span class="codex-topic-ref" data-query="...">` spans *before* `marked` runs, because `marked` strips or corrupts non-standard protocol hrefs. A second pass (`wrapTopicRefs`) handles any that survive the Markdown renderer.
- **Verse-ref injection:** `wrapVerseRefs` scans the generated HTML for Bible references (using `findReferencesInText`) and wraps them in `<span class="verse-ref" data-ref="...">` spans for frontend click handling, with care not to wrap text already inside HTML tags.
- **Null Anthropic client:** `generateAndCache` throws immediately if `anthropic` is null, i.e. no API key is configured.
- **Upsert caching:** `generateAndCache` uses Prisma's `upsert` on the normalized query, so re-generating an existing entry updates it in place rather than creating a duplicate.
- **Max tokens:** Summaries are capped at 1,200 tokens — enough for 3–5 paragraphs plus the related-topics section.
