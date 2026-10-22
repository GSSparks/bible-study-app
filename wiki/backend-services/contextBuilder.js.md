# backend/src/services/contextBuilder.js

## Purpose

Assembles the context that is fed to Claude for all three AI study features: the general Study Assistant, Word Study, and Phrase Study. For the Study Assistant it fetches Bible passages, commentary, Strong's glosses, user notes, and reference documents, then formats them into a system prompt and runs a multi-turn tool-use loop that allows Claude to call `get_passage` mid-response to fetch additional verses. Word Study and Phrase Study follow the same tool-use loop but with dedicated system prompts suited to their respective occurrence-list contexts.

## Key exports

- **`buildPassageContext({ sources, noteIds, userId, includeAllCommentaries, includeWordStudies, documentIds })`** — Fetches passage text from SWORD and/or Markdown modules for each source, optionally pulls all installed commentaries for the primary reference, optionally extracts Strong's keys and looks up dictionary glosses, and loads the user's notes and any referenced document records. Returns `{ passages, wordStudies, notes, documents }`.
- **`buildWordStudyContext({ module, strongsKey })`** — Fetches the Strong's dictionary entry for a key and all occurrences of that key across the full Bible (via `swordService.getStrongsOccurrences`, which builds a full-Bible index on first call and caches it). Caps occurrences at 200 and signals truncation.
- **`askWordStudy({ context })`** — Formats the word-study context into a system prompt and calls `runWithPassageTool` to get a Markdown reply synthesizing usage patterns.
- **`buildPhraseStudyContext({ module, phrase, strongsSequence, displayText })`** — Finds all occurrences of a phrase by exact text match (`phrase`) or by a consecutive sequence of Strong's-tagged words (`strongsSequence`). Caps at 200 and signals truncation.
- **`askPhraseStudy({ context })`** — Like `askWordStudy` but with a phrase-focused system prompt that explicitly describes which matching mode was used (text vs. original-language sequence).
- **`askStudyAssistant({ context, messages })`** — Takes the pre-built `context` object and a conversation `messages` array, constructs a system prompt from `contextToPrompt`, and runs the tool-use loop. Returns `{ reply }`.

## Dependencies

- **Prisma models:** `Note`, `Document`
- **External libraries/APIs:** `@anthropic-ai/sdk` (Claude API), configured via `config.anthropicApiKey` / `config.anthropicModel`
- **Other services:** `swordService.js` (passage fetching, Strong's lookups, full-Bible index), `mdModuleService.js` (Markdown module passage fetching), `config.js`

## Patterns / notes

- **Tool-use loop (`runWithPassageTool`):** An internal function that sends messages to Claude with `GET_PASSAGE_TOOL` available and loops until `stop_reason` is not `tool_use`, feeding tool results back as user turns. Capped at 5 iterations as a safety guard. The system prompt is wrapped in a `cache_control: { type: 'ephemeral' }` block to take advantage of prompt caching, since it is the largest stable input and is repeated on every tool-result round-trip.
- **Null Anthropic client:** The `anthropic` client is initialized to `null` if no API key is configured; every `ask*` function checks for this and throws a clear error rather than failing silently.
- **Note scoping:** Both note queries in `buildPassageContext` are scoped by `userId`; if `userId` is somehow absent, the queries return empty arrays rather than returning all users' notes.
- **Commentary auto-include:** When `includeAllCommentaries` is true, the service fetches all installed SWORD commentaries and all Markdown COMMENTARY modules for the primary reference, skipping any already in the explicit sources list.
- **Strong's occurrence cap:** Both word and phrase study cap occurrences at 200 and expose `truncated` / `totalOccurrenceCount` so the prompt can accurately describe the dataset to Claude.
