# frontend/src/components/LoginModal.jsx

## Purpose

Standard username/password login modal. Shown as an overlay when a user is not authenticated and setup is complete. There is no self-service signup — all accounts are created by an admin.

## Props

| Prop | Type | Description |
|---|---|---|
| `onLogin` | function | Called with `{ username, password }` on successful login |
| `onClose` | function | Called after `onLogin` resolves — closes the modal |

## State / key logic

- `username`, `password` — controlled inputs.
- `error` — displays API error message (e.g., "Invalid credentials").
- `loading` — disables the submit button during the API call.
- On submit, calls `onLogin({ username, password })`, then `onClose()` on success.
- Fixed z-index (`z-50`) so it always renders above all other UI.

## Dependencies

- No external component dependencies — pure form UI.
- `onLogin` is wired to `auth.login()` by `AppShell`.

## Notes

- Rate-limited server-side: 10 login attempts per 15 minutes.
- The modal cannot be dismissed by clicking outside (no backdrop click handler) — the user must log in to proceed, unless the parent chooses to conditionally render it.
- Error messages from the server are designed to avoid username enumeration (constant-time dummy hash on unknown users).
