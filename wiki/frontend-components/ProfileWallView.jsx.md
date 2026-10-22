# frontend/src/components/ProfileWallView.jsx

## Purpose

User wall/profile view. When `username` prop is provided it shows another user's public wall (view-only). Without `username` it shows the current user's own wall with a post composer. Delegates feed rendering to `PostFeed`.

## Props

| Prop | Type | Description |
|---|---|---|
| `username` | string \| null | Target user's username. Null = own wall |
| `auth` | object | `{ user, isLoggedIn }` |
| `onOpenReference` | function | Called when a post contains a clickable verse reference |

## State / key logic

**Data fetching:**
- `username` prop set → calls `api.getUserWall(username)` (public wall, view-only).
- No `username` → calls `api.getMyWall()` (own wall with composer).
- Refetches when `username` changes.

**Post composer (own wall only):**
- `RichEditor` (WYSIWYG editor) for post body.
- Visibility selector: `public` or `fellows` (only fellows can see).
- Submit calls `api.createPost({ body, visibility })`.
- After submit, prepends new post to the feed optimistically.

**`PostFeed` sub-component (or imported component):**
- Renders the array of posts: author avatar, username, timestamp, body (rendered as HTML), comment count.
- Comment expand/collapse per post.
- Own posts: delete button.
- Comment composer inline.

## Dependencies

- `api` (`../api/client.js`) — `getUserWall`, `getMyWall`, `createPost`, `deletePost`, `createComment`, `deleteComment`.
- `PostFeed` — shared feed renderer.
- `RichEditor` — post composer body editor.
- `getAvatarColor` (`../utils/avatar.js`)

## Notes

- Wall view is the same component used for the "Wall" tab inside `ScriptoriumDetail`; when inside a Scriptorium context the post is associated with the Scriptorium.
- Visibility options on own wall: `public` (anyone can see) and `fellows` (only confirmed connections).
- The component is conditionally rendered (not always-mounted) since it has no state worth preserving across user switches.
