# frontend/src/hooks/useAuth.js

## Purpose

Central authentication state hook. Checks whether the application needs first-run bootstrap, fetches the current user session, and exposes login/logout/bootstrap actions. Used at the top level by `AppShell`.

## Props

None — this is a hook, not a component.

## State / key logic

**Initialization sequence on mount:**
1. Call `api.bootstrapStatus()` → if `{ setupRequired: true }`, set `setupRequired = true` and stop.
2. Otherwise call `api.me()` → set `user` to the returned user object (or `null` if 401).

**Exposed values:**

| Value | Type | Description |
|---|---|---|
| `user` | object \| null | Authenticated user (`{ id, username, role }`) or null |
| `setupRequired` | boolean | True when no admin account exists yet |
| `loading` | boolean | True during the initial status/me checks |
| `error` | string \| null | Error message if initialization fails |
| `bootstrap(creds)` | async function | POSTs to `/api/auth/bootstrap`, then refreshes `user` |
| `login(creds)` | async function | POSTs to `/api/auth/login`, then refreshes `user` |
| `logout()` | async function | POSTs to `/api/auth/logout`, clears `user` |
| `refresh()` | async function | Re-fetches `api.me()` to sync user state |

**Error handling:** Errors from `me()` that are not 401 are surfaced in `error`. 401 simply sets `user = null`.

## Dependencies

- `api` (`../api/client.js`) — `bootstrapStatus`, `me`, `bootstrap`, `login`, `logout`.

## Notes

- Source file is at `frontend/src/hooks/useAuth.js`, not in `components/`.
- `loading` remains true until both the bootstrap check and the me-check have settled — ensures `AppShell` doesn't flash the login modal before knowing auth state.
- `setupRequired` takes precedence over everything: if true, `AppShell` renders `BootstrapScreen` exclusively.
