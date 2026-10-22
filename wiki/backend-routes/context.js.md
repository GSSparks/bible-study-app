# backend/src/routes/context.js

## Purpose

Powers the Study Assistant feature. It provides two core operations — building a passage context (assembling Bible text, commentary, notes, and document excerpts) and sending that context plus a conversation history to Claude for an AI response — as well as session persistence (create, retrieve, rename) for saved conversations. Study sessions are scoped per user with ownership checks on every direct-by-ID access to prevent IDOR. The entire router is gated behind login to avoid unmetered AI API usage.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/context/build` | Assembles a passage context object from sources, notes, commentaries, word studies, and documents; body: `{ sources[], noteIds?, includeAllCommentaries?, includeWordStudies?, documentIds? }` |
| POST | `/api/context/ask` | Sends context + message history to Claude; persists the updated conversation as a `StudySession`; body: `{ context, messages[], sessionId?, title?, kind? }`; returns `{ reply, sessionId }` |
| GET | `/api/context/guide/:reference` | Returns the most recently generated passage guide session for the current user and the given reference; 404 if none exists |
| GET | `/api/context/sessions` | Returns up to 20 most recently updated study sessions for the current user |
| GET | `/api/context/sessions/:reference` | Returns all study sessions for the current user anchored to the given reference |
| PATCH | `/api/context/sessions/:id` | Renames a session's title; ownership-checked; body: `{ title }` |

## Auth

`contextRouter.use(requireLogin)` is applied at the router level. All endpoints require a valid session. Session update and retrieval by ID additionally check `session.userId === req.user.id`, returning 404 on mismatch to prevent enumeration.

## Dependencies

- `contextBuilder` — `buildPassageContext`, `askStudyAssistant`
- `../db/prisma` — direct Prisma queries for `StudySession` CRUD
