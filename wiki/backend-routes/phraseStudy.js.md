# backend/src/routes/phraseStudy.js

## Purpose

Implements the Phrase/Word-Sequence Study feature, which finds every occurrence of a selected English phrase or Strong's number sequence across a Bible module and then submits those occurrences to Claude for analysis. The workflow mirrors `context.js`: a two-step build-then-ask split so the frontend can display the occurrence count before the (potentially slower) AI response arrives. The entire router is gated behind login due to AI API costs.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/phrase-study` | Builds the phrase study context (occurrence list) without calling the LLM; body: `{ module, phrase? OR strongsSequence?: string[], displayText? }`; either `phrase` or `strongsSequence` must be provided |
| POST | `/api/phrase-study/ask` | Sends a prebuilt context to Claude and returns the AI analysis; body: `{ context }` |

## Auth

`phraseStudyRouter.use(requireLogin)` is applied at the router level. All endpoints require a valid session.

## Dependencies

- `contextBuilder` — `buildPhraseStudyContext`, `askPhraseStudy`
