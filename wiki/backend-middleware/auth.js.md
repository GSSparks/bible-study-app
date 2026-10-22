# backend/src/middleware/auth.js

**Purpose**

Provides all authentication and authorization middleware for the Express app. It handles session-to-user attachment on every request, login gating, admin-role enforcement, and the "setup required" lock that prevents any API access until the first admin account has been bootstrapped.

**Key exports / contents**

- `attachUser(req, res, next)` — async middleware, runs on every request. Reads `req.session.userId`, queries Prisma for the user (selecting `id`, `username`, `role`, `displayName`, `bio`, `avatarUrl`, `bannerUrl`), and sets `req.user`. If the session references a deleted user, clears `req.session.userId`. Sets `req.user = null` for unauthenticated visitors.
- `requireLogin(req, res, next)` — returns `401` if `req.user` is null; otherwise calls `next()`. Used to gate entire routers via `router.use(requireLogin)`.
- `requireAdmin(req, res, next)` — returns `401` if not logged in, `403` if logged in but `req.user.role !== 'admin'`. Used to gate the admin router.
- `blockUntilBootstrapped(req, res, next)` — async middleware applied to all `/api/*` routes except `/api/auth`. Checks `isBootstrapNeeded()` (from `authService`); returns `503 { setupRequired: true }` if no admin account exists yet. Once bootstrap is confirmed complete, sets a process-level cache (`bootstrapCompletedCache = true`) to avoid re-querying on every subsequent request.
- `resetBootstrapCache()` — exported for use in tests to reset the cached state between test runs.

**Dependencies / relationships**

- Imports `prisma` from `../db/prisma.js` for user lookup.
- Imports `isBootstrapNeeded` from `../services/authService.js`.
- `attachUser` and `blockUntilBootstrapped` are imported by `app.js` and applied globally.
- `requireLogin` and `requireAdmin` are imported by individual route files (e.g. `notesRouter`, `adminRouter`) to gate their handlers.

**Notes**

`blockUntilBootstrapped` uses `req.originalUrl` (not `req.path`) to check for bootstrap endpoints — a critical distinction because `req.path` is relative to the mount point (`/api`) and would not match the full `/api/auth/bootstrap` path. The `bootstrapCompletedCache` is a one-way latch: once set `true` it never resets in production, eliminating the per-request database read for the lifetime of the process.
