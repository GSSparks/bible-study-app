# frontend/src/components/PostFeed.jsx

## Purpose

Reusable post-and-comment feed used in three contexts: personal wall, Scriptorium group wall, and study post wall. The parent owns all fetching and passes `posts`/`loading`/`error` down; this component handles composing new posts (text + up to 4 media files), displaying post cards, and inline comment forms. The shared design avoids duplicating feed logic across three different views.

## Props

| Prop | Type | Description |
|---|---|---|
| `posts` | array | Post objects (including nested `comments` and `author`) |
| `loading` | bool | Shows loading indicator |
| `error` | string | Parent-level error |
| `canPost` | bool | Shows the composer form when true |
| `scriptoriumId` | string | Targets new posts to a Scriptorium (undefined = personal wall) |
| `currentUserId` | string | Enables delete button on own posts |
| `onRefresh` | func | Called after any mutation (post, delete, comment) to trigger parent re-fetch |
| `onViewProfile` | func | `(username) => void` — navigate to a user's profile |

## State / Key Logic

- `composerText`, `mediaFiles`, `mediaPreviews`, `posting` — composer form state. Media files are collected up to 4; previews are object URLs revoked on submit or removal.
- `handlePost` calls `api.createPost({ body, scriptoriumId, mediaFiles })`. Clears composer and calls `onRefresh`.
- `handleDeletePost` calls `api.deletePost(postId)` and refreshes.
- `PostCard` (internal): renders author avatar/name/timestamp, post body, media grid (1 column for single, 2 for multi), comments list, and comment form. Own-post delete button visible via `isAuthor` check.

## Dependencies

- `Avatar`
- `api.createPost`, `api.deletePost`, `api.createComment`

## Notes

- Object URLs for media previews are revoked via `URL.revokeObjectURL` on submit to prevent memory leaks.
- Media grid uses `grid-cols-1` for single items and `grid-cols-2` for multiple, with `maxHeight` varying per count.
- The `PostCard` inline comment form does not support editing or deleting individual comments.
