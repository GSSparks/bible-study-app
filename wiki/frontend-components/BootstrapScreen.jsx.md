# frontend/src/components/BootstrapScreen.jsx

## Purpose

One-time admin account creation screen shown when `useAuth().setupRequired` is true (i.e., no admin account exists yet). Blocks all other UI — there is no way to dismiss it. On successful submission it calls `onComplete` with the new credentials, which triggers the auth bootstrap flow.

## Props

| Prop | Type | Description |
|---|---|---|
| `onComplete` | function | Called with `{ username, password }` when the form is submitted successfully |

## State / key logic

- `username`, `password`, `confirm` — controlled text inputs.
- Client-side validation before submit:
  - Username must be ≥ 3 characters.
  - Password must be ≥ 10 characters.
  - `password` and `confirm` must match.
- `error` — displays validation or API error message.
- `loading` — disables submit button and shows "Setting up…" during the API call.
- On submit, calls `onComplete({ username, password })`. The parent (`AppShell`) wires this to `auth.bootstrap()`, which calls `api.bootstrap()`.

## Dependencies

- No external component dependencies — pure form UI.
- `useAuth` is consumed by the parent; `onComplete` is the bridge.

## Notes

- Shown unconditionally when `setupRequired` is true — replaces the entire app UI.
- Rate-limited server-side: 5 bootstrap attempts per hour.
- The submitted password is the initial admin password; subsequent changes go through `ChangePasswordModal`.
