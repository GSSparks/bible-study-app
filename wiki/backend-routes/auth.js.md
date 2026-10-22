# backend/src/routes/auth.js

## Purpose

Handles all authentication and account-management operations for the Scriptorium instance. This includes first-run bootstrapping (creating the initial admin account), login/logout, session inspection, profile editing, password changes, and admin-only user provisioning. There is no public self-signup; all accounts beyond the first are created by an admin. Rate limiting is applied to login, password-change, and bootstrap endpoints to mitigate brute-force attacks.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/bootstrap-status` | Returns `{ setupRequired: bool }` indicating whether the instance still needs its first admin account |
| POST | `/api/auth/bootstrap` | Creates the initial admin account; rate-limited to 5 attempts/hour; body: `{ username, password }` |
| POST | `/api/auth/login` | Authenticates a user; regenerates session ID on success to prevent session fixation; rate-limited to 10 attempts/15 min; body: `{ username, password }` |
| POST | `/api/auth/logout` | Destroys the current session and clears the session cookie |
| GET | `/api/auth/me` | Returns the currently authenticated user or `null` (no auth required) |
| PATCH | `/api/auth/me` | Updates the logged-in user's `displayName` and/or `bio`; requires login |
| POST | `/api/auth/change-password` | Changes the current user's password; requires login and the correct current password; rate-limited to 10 attempts/15 min; body: `{ currentPassword, newPassword }` |
| GET | `/api/auth/users` | Lists all user accounts; admin-only |
| POST | `/api/auth/users` | Creates a new user account (regular or admin role); admin-only; body: `{ username, password, role }` |

## Auth

- `POST /api/auth/bootstrap`, `GET /api/auth/bootstrap-status`, `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me` are unauthenticated.
- `PATCH /api/auth/me` and `POST /api/auth/change-password` require `requireLogin`.
- `GET /api/auth/users` and `POST /api/auth/users` require `requireAdmin`.

## Dependencies

- `authService` — `isBootstrapNeeded`, `bootstrapAdmin`, `verifyLogin`, `createUser`, `changePassword`, `listUsers`, `updateProfile`
- `express-rate-limit` — `loginLimiter` (10/15 min), `bootstrapLimiter` (5/hour)
- `../middleware/auth` — `requireLogin`, `requireAdmin`
