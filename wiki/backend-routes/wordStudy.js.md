# backend/src/routes/wordStudy.js

## Purpose

Implements the Word Study feature, which looks up a Strong's number in a Bible module, collects every occurrence across the full Bible text, and then submits those occurrences to Claude for analysis. The workflow intentionally mirrors `context.js` and `phraseStudy.js` — a two-step build-then-ask split so the frontend can display occurrence data (dictionary gloss, verse list) immediately while the AI call is pending. The entire router is gated behind login to prevent unmetered API usage.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/word-study` | Builds the word study context (Strong's dictionary gloss + all occurrences in the module) without calling the LLM; body: `{ module, strongsKey }`; returns the context object |
| POST | `/api/word-study/ask` | Sends a prebuilt word study context to Claude and returns the AI analysis; body: `{ context }` |

## Auth

`wordStudyRouter.use(requireLogin)` is applied at the router level. All endpoints require a valid session.

## Dependencies

- `contextBuilder` — `buildWordStudyContext`, `askWordStudy`
