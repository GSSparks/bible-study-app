# backend/prisma/migrations — Migration History

Scriptorium uses Prisma Migrate to manage its PostgreSQL schema. Each migration is a timestamped directory under `backend/prisma/migrations/` containing a `migration.sql` file. Migrations are applied in chronological order; the Prisma migration lock file (`migration_lock.toml`) records the provider and prevents accidental cross-provider applies. Run `npm run prisma:migrate:dev` in development to create and apply new migrations; use `npm run prisma:migrate` in production to apply pending ones only.

## Chronological Table

| Migration Name | Date | Summary |
|---|---|---|
| `20260731000000_init` | 2026-07-31 | Creates the initial schema: `Note`, `Highlight`, `Bookmark`, `Document`, and `StudySession` tables. |
| `20260801000000_notes_and_sessions_flexible` | 2026-08-01 | Makes `Note.reference`/`module` and `StudySession.reference`/`module` nullable so notes can be freestanding and sessions can span multiple windows. |
| `20260801120000_note_quote` | 2026-08-01 | Adds a nullable `quote` column to `Note` to store the verbatim text an annotation is anchored to. |
| `20260817160000_personal_modules` | 2026-08-17 | Creates `PersonalModule` and `PersonalEntry` tables for user-created private commentaries and dictionaries. |
| `20260820200000_users_and_auth` | 2026-08-20 | Creates `User`, `AppSetting`, and the `session` table (used by connect-pg-simple for cookie-backed sessions). |
| `20260821000000_per_user_ownership` | 2026-08-21 | Retrofits `userId` foreign keys onto `Note`, `Highlight`, `Bookmark`, `StudySession`, and `PersonalModule`, backfilling existing rows to the first admin account before enforcing `NOT NULL`. |
| `20260822000000_module_visibility` | 2026-08-22 | Creates `ModuleVisibility` for admin per-module toggling of user access. |
| `20260823000000_connections` | 2026-08-23 | Creates the `Connection` table to track fellow (friend) requests between users. |
| `20260824000000_scriptoriums` | 2026-08-24 | Creates `Scriptorium`, `ScriptoriumMembership`, and `ScriptoriumInvite` tables for study groups. |
| `20260825000000_wall` | 2026-08-25 | Creates `Post` and `Comment` tables for the personal and group wall feed. |
| `20260826000000_studies` | 2026-08-26 | Creates `Study`, `StudyLesson`, `StudyParticipant`, and `StudyLessonCompletion` tables for multi-week structured studies. |
| `20260827000000_study_comments` | 2026-08-27 | Creates `StudyComment` and `StudyCommentLike` tables for per-lesson discussion threads. |
| `20260828000000_study_resources` | 2026-08-28 | Creates `StudyResource` for module/link footer resources attached to studies. |
| `20260905000000_document_content_fields` | 2026-09-05 | Deliberate no-op: schema.prisma had drifted from the real database; no DDL was needed. |
| `20260906000000_personal_entry_fields` | 2026-09-06 | Deliberate no-op: another schema.prisma drift case; the real database already matched the intended state. |
| `20260906010000_studysession_reference_index` | 2026-09-06 | Adds `StudySession_reference_idx`, which schema.prisma had declared but the database never received. |
| `20260907000000_study_resource_note_type` | 2026-09-07 | Adds a nullable `body` column to `StudyResource` to support a new "note" resource type (free-text inline notes on studies). |
| `20261002000000_user_profile_fields` | 2026-10-02 | Adds nullable `displayName` and `bio` columns to `User` for richer user profiles. |
| `20261003000001_media_uploads` | 2026-10-03 | Adds `avatarUrl` and `bannerUrl` to `User`, `bannerUrl` to `Scriptorium`, and `mediaUrls` (JSONB) to `Post` for image attachments. |
| `20261003000002_session_title` | 2026-10-03 | Adds a nullable `title` column to `StudySession` so sessions can be named by the user. |
| `20261003000003_study_banner_url` | 2026-10-03 | Adds `bannerUrl` to `Study` for study cover images. |
| `20261003000004_study_lesson_video_url` | 2026-10-03 | Adds `videoUrl` to `StudyLesson` to embed video content in lesson pages. |
| `20261003000005_scriptorium_tags_about_resources` | 2026-10-03 | Adds `tags`, `about`, and `weeklyVerse` columns to `Scriptorium` and creates the `ScriptoriumResource` table for group link resources. |
| `20261005000000_reflection_prompt` | 2026-10-05 | Adds `reflectionPrompt` to `StudyLesson` and creates `StudyLessonReflection` for per-user, per-lesson written reflections. |
| `20261005130000_resource_types` | 2026-10-05 | Adds `moduleType` to `StudyResource` (for Bible/Dict modules) and upgrades `ScriptoriumResource` to support typed resources (note, document, link) with an optional `body`. |
| `20261008000000_document_collection` | 2026-10-08 | Adds a nullable `collection` column to `Document` for grouping PDFs. |
| `20261009000000_reading_plans` | 2026-10-09 | Creates `ReadingPlan` and `ReadingPlanProgress` tables for scheduled Bible reading plans. |
| `20261010000000_personal_entry_body_md` | 2026-10-10 | Adds `bodyMd` to `PersonalEntry` to store raw Markdown source alongside the existing rendered HTML `body`. |
| `20261012000000_factbook_cache` | 2026-10-12 | Creates `FactbookCache` (serial PK, unique on `query`) to cache AI-generated Bible Factbook summaries. |
| `20261013000000_study_session_kind` | 2026-10-13 | Adds `kind` column (default `'conversation'`) to `StudySession` and a composite index on `(userId, kind, reference)` to support multiple session types. |
| `20261013000001_merriam_cache` | 2026-10-13 | Creates `MerriamCache` (serial PK, unique on `query`, JSONB `data`) to cache Merriam-Webster dictionary API responses. |
| `20261022000000_add_scriptorium_research` | 2026-10-22 | Creates `StudyFinding` and `StudyHighlight` tables to track per-study shared annotations and passage highlights. |
| `20261022000001_study_posts` | 2026-10-22 | Renames `StudyFinding` to `StudyPost`, adds `type` (post/finding) and a self-referential `parentId` column for one-level replies. |
| `20261022000002_study_post_nullable_reference` | 2026-10-22 | Makes `StudyPost.reference` nullable so free-form posts and replies are not required to anchor to a passage. |
| `20261022000003_study_post_media_edit` | 2026-10-22 | Adds nullable `mediaUrls` JSONB column to `StudyPost` for image attachments on study posts. |
| `20261023000000_reflection_shared` | 2026-10-23 | Adds `shared` boolean (default false) to `StudyLessonReflection` so participants can optionally share their reflection with the group. |
| `20261023000001_resource_suggestions` | 2026-10-23 | Adds `status` (default `'approved'`) and nullable `suggestorId` to `StudyResource` to support participant resource suggestions pending editor review. |
| `20261027000000_user_suspended_ai_enabled` | 2026-10-27 | Adds `suspended` (boolean, default false) and `aiEnabled` (boolean, default true) columns to `User` for admin-controlled account suspension and per-user AI feature access. |

---

## 20260731000000_init

Creates the foundational annotation and document tables before any user model existed. `Note`, `Highlight`, and `Bookmark` are keyed by `reference` + `module` with supporting indexes. `Document` stores PDF metadata and extracted text. `StudySession` stores LLM conversation history as JSONB, anchored to a single passage at this point.

## 20260801000000_notes_and_sessions_flexible

Relaxes the schema to support freestanding notes (not tied to any passage) and multi-window study sessions. `Note.reference`, `Note.module`, `StudySession.reference`, and `StudySession.module` are all changed from `NOT NULL` to nullable. A `title` and `fromAssistant` flag are also added to `Note`.

## 20260801120000_note_quote

Adds a single nullable `quote` TEXT column to `Note`. This stores the verbatim source text an annotation is anchored to, enabling text-based re-application of highlights when rendered content is rebuilt.

## 20260817160000_personal_modules

Introduces the personal module system. `PersonalModule` records type (COMMENTARY, DICT, etc.) and name; `PersonalEntry` holds individual entries with optional `key` (for dictionaries) or `reference` (for commentaries), plus composite indexes for efficient lookup by module+key and module+reference.

## 20260820200000_users_and_auth

Creates the `User` table (username, hashed password, role, timestamps) and `AppSetting` for key-value configuration (used for first-run bootstrap detection and branding). Also creates the `session` table exactly matching the `connect-pg-simple` schema for PostgreSQL-backed cookie sessions.

## 20260821000000_per_user_ownership

Retrofits multi-user ownership onto five pre-existing tables (`Note`, `Highlight`, `Bookmark`, `StudySession`, `PersonalModule`). Uses a safe three-step approach: add the column as nullable, backfill all existing rows to the earliest admin account, then enforce `NOT NULL`. Foreign keys and `userId` indexes are added at the end for query performance.

## 20260822000000_module_visibility

Creates the `ModuleVisibility` table, a simple key-value store keyed on `moduleCode` with an `availableToUsers` boolean. This lets admins hide specific SWORD or Markdown modules from non-admin users without removing them from the server.

## 20260823000000_connections

Creates the `Connection` table for the fellows (friends) system. Each row represents one directed request from `requesterId` to `recipientId` with a `status` field (pending/accepted/rejected). A unique constraint on `(requesterId, recipientId)` prevents duplicate requests, and indexed lookups cover both directions.

## 20260824000000_scriptoriums

Introduces study groups. `Scriptorium` records name, description, visibility, and owner. `ScriptoriumMembership` links users to groups with a role. `ScriptoriumInvite` tracks pending invitations with a unique constraint per group+invitee pair, preventing duplicate invitations.

## 20260825000000_wall

Creates the social feed layer. `Post` can belong to a `Scriptorium` (group wall) or have a null `scriptoriumId` (personal wall). `Comment` belongs to a `Post`. Both tables cascade-delete on `User` or `Post` removal.

## 20260826000000_studies

Creates the structured study system: `Study` (a named study, optionally tied to a Scriptorium), `StudyLesson` (ordered lessons with optional passage/module/body), `StudyParticipant` (enrollment with role), and `StudyLessonCompletion` (per-user lesson completion tracking with unique constraint per lesson+user).

## 20260827000000_study_comments

Adds per-lesson discussion threads. `StudyComment` records lesson-anchored text by a participant. `StudyCommentLike` tracks unique per-user likes on comments with a unique constraint on `(commentId, userId)` to prevent double-liking.

## 20260828000000_study_resources

Creates `StudyResource` — footer resources attached at the study level (not per-lesson). Supports commentary module references (`moduleCode`), external links (`url`), and an `order` field for display ordering.

## 20260905000000_document_content_fields

Deliberate no-op migration. The `Document` table already contained all the expected columns (`author`, `pageCount`, `extractedText`); the Prisma schema file had fallen out of sync with the real database. The migration contains only `SELECT 1` to preserve the sequential migration history without touching the database.

## 20260906000000_personal_entry_fields

Deliberate no-op migration. `PersonalEntry` already had `title` (NOT NULL), nullable `key`, and a `moduleId` foreign key; `PersonalModule` never had a `code` column. The schema.prisma file was incorrect; the migration exists only to mark this position in migration history as applied.

## 20260906010000_studysession_reference_index

Adds the `StudySession_reference_idx` index on `StudySession.reference`, which schema.prisma had declared but the database had never received. Uses `CREATE INDEX IF NOT EXISTS` defensively given the schema drift discovered in adjacent migrations.

## 20260907000000_study_resource_note_type

Adds a nullable `body` TEXT column to `StudyResource` to support a third resource type: "note". Commentary and link resources leave this column NULL; note-type resources store their full text here rather than pointing to an external module or URL.

## 20261002000000_user_profile_fields

Adds `displayName` (TEXT) and `bio` (TEXT) to `User` as nullable columns. Existing rows receive NULL, which is valid since both fields are optional for all users.

## 20261003000001_media_uploads

Extends media support across three tables in one migration: adds `avatarUrl` and `bannerUrl` to `User`; adds `bannerUrl` to `Scriptorium`; adds `mediaUrls` (JSONB array) to `Post` for multi-image post attachments.

## 20261003000002_session_title

Adds a single nullable `title` TEXT column to `StudySession` so users can assign a readable name to saved study sessions in the AI assistant.

## 20261003000003_study_banner_url

Adds `bannerUrl` TEXT to `Study` for cover/header images on study pages.

## 20261003000004_study_lesson_video_url

Adds `videoUrl` TEXT to `StudyLesson` to attach a video resource (e.g., a YouTube embed URL) to individual lesson pages.

## 20261003000005_scriptorium_tags_about_resources

Enriches `Scriptorium` with `tags` (TEXT array, non-null, empty default), `about` (TEXT), and `weeklyVerse` (TEXT). Also creates `ScriptoriumResource` for group-level link resources (label, URL, ordering, and an `addedById` foreign key).

## 20261005000000_reflection_prompt

Adds `reflectionPrompt` to `StudyLesson` so lesson authors can pose an open-ended question. Creates `StudyLessonReflection` to store each participant's written response, with a unique constraint per `(lessonId, userId)` ensuring one reflection per user per lesson.

## 20261005130000_resource_types

Extends resource models for broader content types. Adds `moduleType` to `StudyResource` so Bible text and dictionary modules can be cited alongside commentaries. Upgrades `ScriptoriumResource` to support typed entries (link/note/document) by adding `type` (NOT NULL, default `'link'`), `body` (TEXT), and making `url` nullable.

## 20261008000000_document_collection

Adds a nullable `collection` TEXT column to `Document` for grouping PDFs into named collections within the library.

## 20261009000000_reading_plans

Creates the reading plan system. `ReadingPlan` stores a name, description, a built-in flag, and a JSONB `schedule` defining the day-by-day reading list. `ReadingPlanProgress` tracks which days each user has completed, with a unique constraint on `(userId, planId, dayNumber)`.

## 20261010000000_personal_entry_body_md

Adds `bodyMd` TEXT to `PersonalEntry` to preserve the raw Markdown source alongside the existing rendered HTML `body`. Entries created before this migration (e.g., AI-saved commentary) keep `body` as HTML and receive NULL for `bodyMd`; new user-written entries populate both.

## 20261012000000_factbook_cache

Creates `FactbookCache` with a serial primary key and a unique index on `query` to cache AI-generated Bible Factbook article summaries. The `summaryMd` column stores the result; `updatedAt` tracks cache staleness.

## 20261013000000_study_session_kind

Adds a `kind` TEXT column (default `'conversation'`) to `StudySession` to distinguish session types (e.g., word study vs. general conversation). A composite index on `(userId, kind, reference)` is added to accelerate filtered session list queries.

## 20261013000001_merriam_cache

Creates `MerriamCache` with a serial primary key and a unique index on `query` to cache raw JSON responses from the Merriam-Webster dictionary API, avoiding redundant external HTTP calls.

## 20261022000000_add_scriptorium_research

Creates `StudyFinding` and `StudyHighlight` as shared research layers within a study. `StudyFinding` stores annotated passage notes authored by participants. `StudyHighlight` stores verse-level color highlights scoped to a study, with a unique constraint on `(studyId, authorId, reference, module)`.

## 20261022000001_study_posts

Renames `StudyFinding` to `StudyPost` (renaming all constraints and indexes in place). Adds a `type` column (`'post'` or `'finding'`) with backfill logic: existing rows with a `reference` become `'finding'`, others default to `'post'`. Adds a self-referential nullable `parentId` for one-level reply threading.

## 20261022000002_study_post_nullable_reference

Drops the `NOT NULL` constraint on `StudyPost.reference` so that free-form posts (`type='post'`) and reply posts (`parentId` set) are not required to carry a passage anchor, which was only meaningful for findings.

## 20261022000003_study_post_media_edit

Adds a nullable `mediaUrls` JSONB column to `StudyPost` for image attachments. Mirrors the same column pattern on `Post`. Existing rows receive NULL.

## 20261023000000_reflection_shared

Adds a `shared` BOOLEAN column (NOT NULL, default false) to `StudyLessonReflection`. When set to true, a participant's reflection is visible to other study members. Existing reflections default to private.

## 20261023000001_resource_suggestions

Extends `StudyResource` to support participant-suggested resources pending leader review. Adds `status` TEXT (NOT NULL, default `'approved'`) and a nullable `suggestorId` TEXT foreign key referencing `User.id` (ON DELETE SET NULL). An index on `suggestorId` supports filtering suggested resources by author.

## 20261027000000_user_suspended_ai_enabled

Adds two administration columns to `User`:
- `suspended` BOOLEAN NOT NULL DEFAULT false — when true, `requireLogin` middleware returns 403 on every API request and `verifyLogin` blocks new logins for that account.
- `aiEnabled` BOOLEAN NOT NULL DEFAULT true — when false, `requireAiEnabled` middleware blocks the Study Assistant (`context.js`) and Word Study (`wordStudy.js`) routes for that user.

Both columns default to safe values so all existing users are unaffected.
