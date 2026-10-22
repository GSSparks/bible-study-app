# backend/src/services/authService.js

## Purpose

Handles all user account operations: password hashing and verification, first-run admin bootstrapping, user creation, login, profile updates, and password changes. It exists as a dedicated service layer to keep authentication logic — especially security-sensitive concerns like timing-safe comparisons and race-condition-safe bootstrapping — isolated from Express route handlers.

## Key exports

- **`hashPassword(password)`** — Hashes a plaintext password with argon2.
- **`verifyPassword(hash, password)`** — Verifies a password against an argon2 hash; catches malformed-hash exceptions and returns `false` rather than throwing.
- **`validatePasswordStrength(password)`** — Returns an error string if the password is shorter than 10 characters, or `null` if valid.
- **`isBootstrapNeeded()`** — Returns `true` if no users exist yet (used to gate the first-run setup flow).
- **`bootstrapAdmin({ username, password })`** — Creates the first admin account inside a Prisma transaction that also inserts a `bootstrap_completed` row into `AppSetting`. The unique constraint on that key prevents a second bootstrap even under concurrent requests.
- **`listUsers()`** — Returns all users (id, username, role, createdAt, lastLoginAt) for the admin management view. Never includes `passwordHash`.
- **`createUser({ username, password, role })`** — Creates a regular user account (admin-only route, not enforced here). Validates username length, password strength, and role value.
- **`verifyLogin({ username, password })`** — Looks up a user and runs argon2 against either their real hash or a constant `DUMMY_HASH` when the username does not exist, preventing timing-based username enumeration. Updates `lastLoginAt` on success.
- **`updateProfile({ userId, displayName, bio })`** — Updates optional display name (max 50 chars) and bio (max 300 chars) for the logged-in user.
- **`changePassword({ userId, currentPassword, newPassword })`** — Verifies the current password before replacing it; enforces the 10-character minimum on the new password.

## Dependencies

- **Prisma models:** `User`, `AppSetting`
- **External libraries:** `argon2` (npm)

## Patterns / notes

- **Timing-safe login:** A module-level `DUMMY_HASH` constant ensures the argon2 comparison always runs, even for non-existent usernames, equalizing response time between "user not found" and "wrong password" paths. The comment documents that the two paths were measured at 210 ms vs. 211 ms before relying on this.
- **Race-condition-safe bootstrap:** `bootstrapAdmin` wraps both the `AppSetting` insert and the `User` create in a single Prisma transaction. The unique constraint on `AppSetting.key = 'bootstrap_completed'` guarantees exactly one admin can be created under concurrent requests without requiring a serializable isolation level.
- **No authorization enforcement here:** Route-level middleware (`requireAdmin`) gates which routes call `createUser`; this service does not re-check that.
- **Consistent select shape:** Every function that returns a user object uses the same explicit `select` to ensure `passwordHash` is never accidentally included in a JSON response.
