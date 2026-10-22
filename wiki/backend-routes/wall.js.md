# backend/src/routes/wall.js

## Purpose

Manages the social post feed ("Wall"). Provides the home feed (posts from the current user and their Fellows), personal wall views (own or another user's), Scriptorium wall views, post creation with optional media attachments, post deletion, and comment CRUD. Authorization for viewing another user's wall and for deletion is enforced inside `wallService`. The entire router is gated behind login.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/wall/feed` | Returns the home feed: posts from the current user and accepted Fellows |
| GET | `/api/wall/me` | Returns the current user's own wall posts |
| GET | `/api/wall/user/:username` | Returns posts on another user's wall |
| GET | `/api/wall/scriptorium/:id` | Returns posts on a Scriptorium's wall |
| POST | `/api/wall/posts` | Creates a post with optional media files; multipart: field `body`, optional `scriptoriumId`, optional file attachments; media URLs and types are stored in `mediaUrls` JSON |
| DELETE | `/api/wall/posts/:id` | Deletes a post; ownership enforced inside service |
| POST | `/api/wall/posts/:id/comments` | Creates a comment on a post; body: `{ body }` |
| DELETE | `/api/wall/comments/:id` | Deletes a comment; ownership enforced inside service |

## Auth

`wallRouter.use(requireLogin)` is applied at the router level. All endpoints require a valid session. Ownership and visibility checks are handled inside `wallService`.

## Dependencies

- `wallService` — `createPost`, `getWall`, `getScriptoriumWall`, `getHomeFeed`, `deletePost`, `createComment`, `deleteComment`
- `../middleware/upload` — `uploadPostMedia`, `mimeToType`
