# backend/src/services/studyService.js

## Purpose

Manages the full lifecycle of multi-week structured studies within Scriptoriums or as solo personal studies. A study has an owner (creator), a set of lessons, participants who track progress, a curated resource list, lesson comments with likes, reflection prompts, discussion posts (findings + free-form), shared highlights, and import/export. It also calls the Anthropic API to generate draft lesson plans or single-session study guides that a leader reviews before publishing.

## Key exports

**Study CRUD**
- **`createStudy({ creatorId, title, description, scriptoriumId })`** — Creates study + owner's participant row in one transaction. Checks Scriptorium membership if `scriptoriumId` is set.
- **`getStudy(studyId, viewerId)`** — Returns study with `isParticipant`/`myRole` annotated; 404 for invisible solo studies.
- **`listMyStudies(userId)`** — All studies the caller participates in.
- **`listScriptoriumStudies(scriptoriumId, viewerId)`** — Studies within a Scriptorium, after visibility check.
- **`joinStudy(studyId, userId)`** — Joins a group study after confirming Scriptorium membership; group-study-only.
- **`leaveStudy(studyId, userId)`** / **`deleteStudy(studyId, userId)`** — Leave (non-owner) or delete (owner-only).
- **`updateStudy(studyId, userId, { title, description })`** — Owner-only update.

**Lessons**
- **`createLesson(studyId, callerId, { order, title, module, reference, body })`** — Owner-only lesson authoring.
- **`bulkCreateLessons(studyId, callerId, lessons)`** — Accepts up to 52 lessons in one transaction (all-or-nothing).
- **`updateLesson(lessonId, callerId, ...)`** / **`deleteLesson(lessonId, callerId)`** — Owner-only.
- **`listLessons(studyId, viewerId)`** — Returns lessons with the viewer's reflection pre-joined.
- **`getLesson(lessonId, viewerId)`** — Returns lesson with `myReflection`.
- **`markLessonComplete(lessonId, userId)`** / **`unmarkLessonComplete(...)`** — Requires participation; enforces reflection prompt completion before marking done when `reflectionPrompt` is set.
- **`getProgress(studyId, userId)`** — Returns `{ total, completed, completedLessonIds }`.

**Comments**
- **`listComments(lessonId, viewerId)`** — Returns comments with like count and `likedByMe` flag, no participation required.
- **`createComment(lessonId, authorId, body)`** — Requires participation.
- **`deleteComment(commentId, userId)`** — Author-only.
- **`likeComment(commentId, userId)`** / **`unlikeComment(...)`** — Requires participation; upsert prevents duplicate-like errors.

**Reflections**
- **`getReflection(lessonId, userId)`** / **`saveReflection(lessonId, userId, body)`** — Per-participant personal reflection on a lesson. Save requires participation.
- **`listAllReflections(studyId, callerId)`** — Owner-only; returns all reflections grouped by lesson with user info.

**Resources**
- **`addResource(studyId, callerId, { type, label, moduleCode, url, body, order })`** — Owner-only. Types: `commentary`, `module`, `link`, `note`.
- **`removeResource(resourceId, callerId)`** / **`listResources(studyId, viewerId)`**
- **`getResourceContent(resourceId, lessonId, viewerId)`** — Fetches SWORD passage content for a commentary/module resource against a lesson's reference, or returns the link URL / note text directly.

**AI drafting**
- **`generateLessonDrafts(studyId, callerId, { topic, weekCount, module, outline })`** — Two modes: (1) `outline=true` generates a single-session study guide as Markdown; (2) multi-week mode calls Claude for a JSON array of `weekCount` lesson drafts, validates each proposed reference against the real SWORD module, and clears unresolvable references rather than letting broken ones persist.

**Export / Import**
- **`exportStudy(studyId, userId)`** — Returns a JSON-serializable study object with lessons and resources (format: `scriptorium-study`, version 1).
- **`importStudy({ scriptoriumId, creatorId, data })`** — Validates the export format, creates the study + participant + lessons + resources in a single transaction.

**Discussion posts / findings**
- **`createStudyPost(studyId, authorId, ...)`** / **`createStudyReply(parentId, authorId, body)`** / **`listStudyPosts(studyId, viewerId)`** / **`deleteStudyPost(postId, userId)`** / **`listMyStudyFindings(userId, { reference, prefix })`**

**Shared highlights**
- **`createStudyHighlight(studyId, authorId, { reference, module, color })`** — Upsert; requires participation.
- **`deleteStudyHighlight(highlightId, userId)`** — Author or study owner.
- **`listMyStudyHighlights(userId, { reference, prefix, module })`**

## Dependencies

- **Prisma models:** `Study`, `StudyLesson`, `StudyParticipant`, `StudyLessonCompletion`, `StudyLessonReflection`, `StudyComment`, `StudyCommentLike`, `StudyResource`, `StudyPost`, `StudyHighlight`
- **External libraries/APIs:** `@anthropic-ai/sdk` (lesson draft generation)
- **Other services:** `scriptoriumService.js` (`getScriptorium`, visibility checks), `swordService.js` (reference validation, resource content)

## Patterns / notes

- **Visibility delegation:** `assertCanViewStudy` delegates directly to `getScriptorium` for group studies, reusing its 404-masking logic rather than re-implementing it.
- **Consistent 404 masking:** `assertOwnerOfStudy`, `createComment`, `likeComment`, etc. all return 404 (not 403) when a caller has no business knowing the resource exists.
- **Reference validation in AI drafts:** `generateLessonDrafts` (multi-week mode) calls `swordService.getPassage` on every proposed reference before returning the draft. References that fail or return zero verses are cleared so broken ones never silently become real `StudyLesson` records.
- **Transactional consistency:** Study creation, bulk lesson creation, and invite acceptance all use Prisma transactions to ensure related rows are never partially created.
- **Upsert for idempotent actions:** `markLessonComplete`, `likeComment`, `createStudyHighlight`, and `saveReflection` all use `upsert` so repeated calls are safe no-ops.
- **Reflection gate on completion:** `markLessonComplete` checks whether a reflection prompt exists and whether the user has answered it before allowing the lesson to be marked complete.
