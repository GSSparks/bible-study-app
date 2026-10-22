# backend/src/services/wallService.js

## Purpose

Manages the social wall / feed: personal wall posts and Scriptorium wall posts, with comments on each. Personal walls are visible only to the wall owner and their Fellows. Scriptorium walls inherit Scriptorium visibility rules entirely. The home feed aggregates personal-wall posts from the caller and their Fellows plus all Scriptorium-wall posts from groups the caller belongs to, returned as a single chronologically ordered list.

## Key exports

- **`createPost({ authorId, scriptoriumId, body, mediaUrls })`** — Creates a post on the caller's personal wall (if `scriptoriumId` is null) or on a Scriptorium wall (requires membership, verified via `assertCanPostToScriptorium`). Returns the full post with comments included.
- **`getWall(usernameOrOwnerId, viewerId, { byUsername })`** — Fetches a user's personal wall posts. Returns 404 (masked as "Wall not found") if the viewer is neither the owner nor a Fellow of the owner.
- **`getScriptoriumWall(scriptoriumId, viewerId)`** — Fetches a Scriptorium's wall posts. Delegates the visibility check entirely to `getScriptorium` from `scriptoriumService`.
- **`getHomeFeed(userId)`** — Builds the caller's aggregated home feed: queries accepted connections in both directions plus Scriptorium memberships, then fetches the most recent 50 posts matching either personal-wall-by-fellow-or-self or Scriptorium-wall-by-membership. Returns posts with Scriptorium name included for context.
- **`deletePost(postId, userId)`** — Deletes the post if the caller is the author; 404 (masked) for any other caller.
- **`createComment({ postId, authorId, body })`** — Adds a comment to a post after re-deriving the post's visibility (Scriptorium membership or Fellow relationship), so the server never trusts the client's implicit claim of access. Returns the updated post with all comments.
- **`deleteComment(commentId, userId)`** — Deletes the comment if the caller is the author; 404 (masked) otherwise.

## Dependencies

- **Prisma models:** `Post`, `Comment`, `Connection`, `ScriptoriumMembership`, `User`
- **Other services:** `scriptoriumService.js` (`getScriptorium`, `areFellows`)

## Patterns / notes

- **Consistent 404 masking:** `getWall` returns `"Wall not found"` (not `"Access denied"`) for non-Fellows, so an attacker cannot enumerate which users are not Friends of the viewer. `deletePost` and `deleteComment` use the same pattern for non-author callers.
- **Access re-derived on comment:** `createComment` re-checks whether the commenter can actually see the post (Scriptorium membership or Fellow relationship) rather than trusting that a request with a valid `postId` implies access, preventing cross-context comment injection.
- **Two-query home feed:** `getHomeFeed` runs three parallel queries (sent connections, received connections, memberships) then one combined post query, rather than a convoluted single-query OR, because the two halves of the feed are not cleanly expressible as one Prisma where clause.
- **50-post cap on home feed:** The feed is capped at 50 posts for now; no pagination exists yet.
- **Visibility delegation for Scriptorium walls:** `getScriptoriumWall` and `createComment` (Scriptorium-post path) both call `getScriptorium` directly, inheriting its 404-masking behaviour for private Scriptoriums without re-implementing it.
