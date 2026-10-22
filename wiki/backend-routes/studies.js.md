# backend/src/routes/studies.js

## Purpose

Manages multi-week structured studies — the platform's curriculum feature. Covers the full study lifecycle: creation, import/export, listing, updating, deletion, participant management, lesson CRUD, per-lesson completion tracking, reflections, comments with likes, study-scoped posts and replies, study-level resources, and research highlights. Authorization (ownership, membership) is enforced inside `studyService`. The entire router is gated behind login.

## Endpoints

### Study Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/studies/mine` | Lists studies the current user created or participates in |
| GET | `/api/studies/scriptorium/:id` | Lists studies belonging to a specific Scriptorium |
| POST | `/api/studies` | Creates a new study; body: `{ title, description?, scriptoriumId? }` |
| POST | `/api/studies/import` | Imports a study from exported JSON; body: `{ scriptoriumId?, data }` |
| GET | `/api/studies/:id` | Returns study details |
| PUT | `/api/studies/:id` | Updates study title/description |
| DELETE | `/api/studies/:id` | Deletes a study |
| GET | `/api/studies/:id/export` | Downloads the study as a `.study.json` file |
| POST | `/api/studies/:id/join` | Joins a study |
| POST | `/api/studies/:id/leave` | Leaves a study |
| GET | `/api/studies/:id/participants` | Lists study participants |
| GET | `/api/studies/:id/progress` | Returns the current user's lesson completion progress for the study |

### Lessons

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/studies/:id/lessons` | Lists all lessons for a study |
| POST | `/api/studies/:id/lessons` | Creates a single lesson; body: `{ order, title, module?, reference?, body? }` |
| POST | `/api/studies/:id/lessons/bulk` | Creates multiple lessons at once; body: `{ lessons: [] }` |
| POST | `/api/studies/:id/generate-lessons` | Uses AI to draft lesson outlines; body: `{ topic, weekCount, module?, outline? }` |
| GET | `/api/studies/lessons/:lessonId` | Returns a single lesson |
| PUT | `/api/studies/lessons/:lessonId` | Updates a lesson |
| DELETE | `/api/studies/lessons/:lessonId` | Deletes a lesson |
| POST | `/api/studies/lessons/:lessonId/complete` | Marks a lesson as complete for the current user |
| DELETE | `/api/studies/lessons/:lessonId/complete` | Unmarks a lesson as complete |

### Reflections

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/studies/lessons/:lessonId/reflection` | Returns the current user's reflection for a lesson |
| PUT | `/api/studies/lessons/:lessonId/reflection` | Saves/updates the current user's reflection; body: `{ body }` |
| GET | `/api/studies/:id/reflections` | Lists all participants' reflections for a study |

### Comments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/studies/lessons/:lessonId/comments` | Lists comments on a lesson |
| POST | `/api/studies/lessons/:lessonId/comments` | Creates a comment; body: `{ body }` |
| DELETE | `/api/studies/comments/:commentId` | Deletes a comment |
| POST | `/api/studies/comments/:commentId/like` | Likes a comment |
| DELETE | `/api/studies/comments/:commentId/like` | Unlikes a comment |

### Study Resources

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/studies/:id/resources` | Lists resources attached to a study |
| POST | `/api/studies/:id/resources` | Adds a resource; body: `{ type, label, moduleCode?, moduleType?, url?, body?, order? }` |
| DELETE | `/api/studies/resources/:resourceId` | Removes a resource |
| GET | `/api/studies/lessons/:lessonId/resources/:resourceId` | Returns the rendered content for a specific lesson resource |

### Study Posts (Discussion)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/studies/:id/posts` | Lists discussion posts for a study |
| POST | `/api/studies/:id/posts` | Creates a discussion post; body: `{ type, reference?, module?, title?, body }` |
| POST | `/api/studies/posts/:postId/replies` | Adds a reply to a post; body: `{ body }` |
| DELETE | `/api/studies/posts/:postId` | Deletes a post |

### Research (Cross-Study Findings and Highlights)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/studies/research/findings?reference=<ref>&prefix=<prefix>` | Lists the current user's study findings (notes/reflections) for a reference across all studies |
| GET | `/api/studies/research/highlights?reference=<ref>&prefix=<prefix>&module=<mod>` | Lists the current user's study highlights for a reference |
| POST | `/api/studies/:id/research/highlights` | Creates a study highlight; body: `{ reference, module, color }` |
| DELETE | `/api/studies/:id/research/highlights/:highlightId` | Deletes a study highlight |

## Auth

`studiesRouter.use(requireLogin)` is applied at the router level. All endpoints require a valid session. Ownership and membership authorization is enforced inside `studyService`.

## Dependencies

- `studyService` — all study/lesson/comment/resource/reflection/post/highlight operations (24 imported functions)
