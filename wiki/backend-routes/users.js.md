# backend/src/routes/users.js

## Purpose

Exposes public user profile pages for any registered user. Returns profile metadata (username, display name, bio, avatar, banner), public stats (post count, fellow count), and — for the requesting user's own profile — a note count. Also returns the connection status between the viewer and the profile owner (none, sent, received, accepted, self) to drive the Connect/Pending/Fellows UI button. The router requires login because profile visibility is limited to authenticated users.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/:username` | Returns `{ user, stats: { postCount, fellowCount, noteCount? }, connectionStatus, connectionId }` for the given username; 404 if the user does not exist |

## Auth

`usersRouter.use(requireLogin)` is applied at the router level. All endpoints require a valid session.

## Dependencies

- `../db/prisma` — queries `User`, `Post`, `Connection`, and `Note` models
