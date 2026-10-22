# frontend/src/components/FellowsView.jsx

## Purpose

Connections management view ("Fellows"). Allows users to search for other accounts, send/accept/reject connection requests, and remove existing connections. Shows incoming pending requests and current fellows list.

## Props

| Prop | Type | Description |
|---|---|---|
| `isActive` | boolean | Controls rendering (conditionally rendered, not always-mounted) |
| `auth` | object | `{ user, isLoggedIn }` |
| `onViewProfile` | function | Called with a username to navigate to their profile/wall |

## State / key logic

**Username search:**
- Controlled input with 300ms debounce.
- On query change, calls `api.searchUsers(query)`.
- Results rendered by `SearchResultAction` sub-component.

**`SearchResultAction` sub-component:**
- Determines the relationship state for each search result: `connected`, `pending_sent`, `pending_received`, `none`.
- Renders appropriate action button per state:
  - `none` → "Add Fellow" (sends request)
  - `pending_sent` → "Pending" (disabled, or cancel option)
  - `pending_received` → "Accept" / "Decline" buttons
  - `connected` → "Connected" badge + "Remove" option

**Incoming requests section:**
- `api.listPendingRequests()` — shows incoming requests with Accept / Decline buttons.
- Accepting via `api.acceptFellowRequest(id)`; declining via `api.declineFellowRequest(id)`.
- List updates optimistically on action.

**Fellows list:**
- `api.listFellows()` — current confirmed connections.
- Each fellow: avatar, username, "View Profile" link → `onViewProfile(username)`.
- "Remove" button calls `api.removeFellow(id)`.

**Login gate:**
- Renders a "Sign in to see your fellows" prompt when `!isLoggedIn`.

## Dependencies

- `api` (`../api/client.js`) — `searchUsers`, `sendFellowRequest`, `acceptFellowRequest`, `declineFellowRequest`, `removeFellow`, `listFellows`, `listPendingRequests`.
- `getAvatarColor` (`../utils/avatar.js`) — for fellow avatar initials color.

## Notes

- `Connection` model is bidirectional — one row per pair, status `pending` or `accepted`. The API abstracts direction so the frontend only sees relationship state from the current user's perspective.
- This view is conditionally rendered (not always-mounted) because it has no persistent state worth preserving across navigation.
