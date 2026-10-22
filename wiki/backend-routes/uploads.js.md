# backend/src/routes/uploads.js

## Purpose

Handles all user-generated media uploads: user avatars, user profile banners, Scriptorium banners (manual upload or AI-generated SVG), study banners (manual or AI-generated SVG), and lesson videos. AI banner generation calls the Anthropic API to produce a themed SVG; the result is saved to disk and the URL is stored in the relevant DB record. Ownership checks ensure users can only upload banners for Scriptoriums or studies they own. The entire router requires login.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/uploads/avatar` | Uploads an image and sets it as the current user's avatar; multipart: field `file` |
| POST | `/api/uploads/banner/user` | Uploads an image and sets it as the current user's profile banner; multipart: field `file` |
| POST | `/api/uploads/banner/scriptorium/:id` | Uploads a banner image for a Scriptorium the current user owns; multipart: field `file` |
| POST | `/api/uploads/banner/ai/scriptorium/:id` | Generates an AI SVG banner for a Scriptorium the current user owns and saves it as the banner |
| POST | `/api/uploads/banner/study/:id` | Uploads a banner image for a study the current user created; multipart: field `file` |
| POST | `/api/uploads/banner/ai/study/:id` | Generates an AI SVG banner for a study the current user created and saves it as the banner |
| POST | `/api/uploads/video/lesson/:id` | Uploads a video file for a study lesson; requires the current user to be the study creator |
| DELETE | `/api/uploads/video/lesson/:id` | Removes the video from a study lesson (clears the `videoUrl` field); requires the current user to be the study creator |

## Auth

`uploadsRouter.use(requireLogin)` is applied at the router level. All endpoints require a valid session. Ownership is checked per-route against `ownerId`/`creatorId` in Prisma queries; 404 is returned on mismatch.

## Dependencies

- `../middleware/upload` — `uploadAvatar`, `uploadBanner`, `uploadLessonVideo`, `UPLOADS_PATH`
- `../db/prisma` — updates `User`, `Scriptorium`, `Study`, `StudyLesson` records with file URLs
- `@anthropic-ai/sdk` — Anthropic client for AI SVG banner generation
- `../config` — `config.anthropicApiKey`, `config.anthropicModel`
- `node:path`, `node:fs`, `node:crypto` — file path handling, writing SVG files, generating UUIDs
