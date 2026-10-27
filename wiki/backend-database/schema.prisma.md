# backend/prisma/schema.prisma

**Purpose**

Defines the complete PostgreSQL database schema for Scriptorium using Prisma's schema language. Every table, column, relation, index, and constraint in the application is declared here. It is the single source of truth for the data layer — all migrations are generated from changes to this file.

**Key exports / contents**

The schema defines the following models:

- **`User`** — core identity record. Fields: `username` (unique), `passwordHash`, `role` (user/admin), `suspended` (boolean, default false — blocks login and API access immediately), `aiEnabled` (boolean, default true — gates Study Assistant and Word Study routes), `displayName`, `bio`, `avatarUrl`, `bannerUrl`, `lastLoginAt`. Has relations to all user-owned data (notes, highlights, bookmarks, study sessions, personal modules, connections, memberships, posts, comments, reading plan progress, etc.).

- **`Note`** — user annotations. Anchored to `reference` + `module` or freestanding. `tags` array enables multi-purpose storage: `['book-highlight', color]` marks book prose highlights (stored as notes rather than in `Highlight` because they need the `quote` field for text-based re-application). `fromAssistant` flag tracks AI-generated notes.

- **`Highlight`** — verse-level highlights keyed to `reference` + `module` + `color`. Five colours supported (not enforced at DB level). Distinct from book highlights (which use `Note`).

- **`Bookmark`** — saved navigation positions keyed to `reference` + `module`, with an optional `label`.

- **`Document`** — PDF library metadata: `title`, `author`, `collection`, `filename` (unique), `pageCount`, `extractedText` (capped at 200K chars in application code). Not user-scoped — all users share the admin-managed library.

- **`StudySession`** — AI assistant conversation history. `messages` and `contextSnapshot` stored as JSON. `kind` distinguishes `'guide'` (Passage Guide) from `'conversation'` (Study Assistant). Indexed by `(userId, kind, reference)` for efficient per-passage guide lookup.

- **`PersonalModule`** / **`PersonalEntry`** — user-created private commentary or dictionary content. `PersonalModule` is a named container (type: COMMENTARY or DICT); `PersonalEntry` holds individual entries keyed by `key` (dict) or `reference` (commentary). Entries support range overlap matching in the application layer.

- **`Connection`** — Fellows (mutual connection) requests. One row per pair with `status` (pending/accepted/declined). `requesterId`/`recipientId` track direction but the accepted relationship is symmetric. `@@unique([requesterId, recipientId])` prevents duplicate requests.

- **`AppSetting`** — key-value store for instance-level configuration (branding, bootstrap marker). `key` is the primary key.

- **`ModuleVisibility`** — admin toggle for whether each SWORD/MD module is visible to regular users. `moduleCode` is the primary key.

- **`Scriptorium`** — study group (the app's central social concept). Fields: `name`, `description`, `visibility` (private/public), `bannerUrl`, `tags`, `about`, `weeklyVerse`, `ownerId`. Relations to memberships, invites, posts, studies, resources.

- **`ScriptoriumMembership`** — join table between `User` and `Scriptorium`. `role` (owner/member). `@@unique([scriptoriumId, userId])`.

- **`ScriptoriumInvite`** — invite-flow for private Scriptoriums. Routes through the Fellows graph (you can only invite someone you're connected to). `status` (pending/accepted/declined). Re-inviting after a decline resets the row.

- **`Post`** — unified model for personal-wall and Scriptorium-wall posts. `scriptoriumId = null` means a personal post. `mediaUrls` is a JSON array of `{url, type}` objects.

- **`Comment`** — comments on posts.

- **`Study`** — structured multi-week study. Can be attached to a `Scriptorium` (`scriptoriumId` set) or private/solo (`scriptoriumId = null`). Has lessons, participants, resources, posts, and highlights.

- **`StudyLesson`** — one lesson (week) within a study. Fields: `order`, `title`, `module`, `reference`, `body` (leader's notes), `videoUrl`, `reflectionPrompt`. Has completions, reflections, and comments.

- **`StudyParticipant`** — join table for study membership. `role` (owner/participant). `@@unique([studyId, userId])`.

- **`StudyLessonCompletion`** — per-user per-lesson completion marker. `@@unique([lessonId, userId])`.

- **`StudyLessonReflection`** — per-user per-lesson private reflection text, with a `shared` boolean (default false) for optionally sharing with the group. `@@unique([lessonId, userId])`.

- **`StudyComment`** / **`StudyCommentLike`** — lesson-level discussion comments and per-user likes. `@@unique([commentId, userId])` on likes.

- **`StudyResource`** — curated resources attached to a study (not a specific lesson). `type` is `"commentary"`, `"module"`, `"link"`, or `"note"`. Commentary/module types reference an installed module by `moduleCode`. `status` (`'approved'`/`'pending'`) and `suggestorId` enable participant resource suggestions pending editor review.

- **`ScriptoriumResource`** — member-submitted links or notes attached to a Scriptorium (not a study).

- **`ReadingPlan`** — reading schedule. `schedule` is a JSON array of `{ day, label, passages[] }`. `isBuiltIn` marks auto-seeded plans.

- **`ReadingPlanProgress`** — per-user per-day completion for a reading plan. `@@unique([userId, planId, dayNumber])`.

- **`FactbookCache`** — caches LLM-generated Codex/Factbook AI overview summaries. `query` is normalised (trimmed lowercase). Avoids repeated API calls for the same term.

- **`MerriamCache`** — caches Merriam-Webster API responses. Same normalised `query` key pattern.

- **`StudyPost`** — unified study-level discussion post (type `'post'` or `'finding'`). `parentId` enables one level of replies. `reference` + `module` anchor "finding" type posts to a passage. `mediaUrls` (JSONB, nullable) stores image attachments.

- **`StudyHighlight`** — shared verse highlights visible to all study participants, distinct from personal highlights. `@@unique([studyId, authorId, reference, module])`.

**Dependencies / relationships**

- Generated Prisma client is imported by `backend/src/db/prisma.js` and used throughout all service files.
- After any change: run `npm run prisma:migrate:dev` (dev) to create a migration, then `npm run prisma:generate` to regenerate the client. In production: `npm run prisma:migrate`.
- The Dockerfile CMD runs `npx prisma migrate deploy` before starting the server.

**Notes**

- Book highlights are stored as `Note` records (with `tags: ['book-highlight', color]` and `reference: 'book-highlight:MODULE'`), not in the `Highlight` model, because they require the `quote` field for text-matching re-application. This is a critical non-obvious design decision.
- `StudySession.kind` is a plain string (not an enum) — valid values are `'guide'` and `'conversation'`; the default is `'conversation'`.
- `Connection` uses a single-row-per-pair pattern (not two directional rows) to prevent sync issues and simplify "are these two connected?" queries.
- `FactbookCache` and `MerriamCache` are application-managed caches with no TTL — they accumulate indefinitely. Pruning them requires direct database queries.
- `User.suspended` takes effect on the very next API request (checked in `requireLogin` middleware); it also blocks re-login via `verifyLogin`. Self-suspension and self-deletion are blocked at the admin route level.
