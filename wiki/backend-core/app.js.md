# backend/src/app.js

**Purpose**

Constructs and exports the Express application factory function `createApp()`. This is the central wiring point for the entire backend: it sets up security middleware, session handling, mounts all ~24 API routers, serves uploaded files and SWORD module images as static assets, and falls back to serving the built React SPA for all non-API routes. Keeping app construction in a factory function (rather than a module-level side effect) allows the test suite to create fresh app instances without port conflicts.

**Key exports / contents**

- `createApp()` — factory function that returns a fully configured Express app instance.
- Security middleware: `helmet` (CSP disabled for separate tuning), `cors`, `express.json` (2 MB limit).
- Session: `express-session` with a `connect-pg-simple` PostgreSQL store (30-day rolling cookie, `httpOnly`, `sameSite: lax`, `secure: auto`). In test mode (`NODE_ENV=test`) the PgSession store is skipped and the in-memory default is used.
- `app.set('trust proxy', 1)` — required for correct `secure` cookie behaviour behind a reverse proxy.
- `attachUser` middleware applied globally — populates `req.user` from session on every request.
- `GET /api/health` — unauthenticated health check endpoint.
- `authRouter` mounted at `/api/auth` *before* `blockUntilBootstrapped` — login and bootstrap endpoints must remain reachable before any admin account exists.
- `blockUntilBootstrapped` applied to all subsequent `/api/*` routes — returns 503 with `{ setupRequired: true }` until the first admin account is created.
- All feature routers mounted under `/api/`: modules, bible, search, pdf, notes, context, strongs, dictionary, word-study, personal-modules, phrase-study, admin, branding, connections, scriptoriums, wall, studies, users, uploads, devotionals, reading-plans, topics, wikipedia, merriam, books, codex (`/api/codex`), bible-maps.
- `/api/sword-data` — static file server for SWORD module image assets (e.g. maps in dictionary entries), resolved against `SWORD_MODULES_PATH/.sword`.
- `/uploads` — static file server for user-uploaded content (avatars, banners, post media, lesson videos).
- SPA fallback: `express.static(FRONTEND_DIST)` and `GET *` → `index.html` for all non-API paths.
- `errorHandler` mounted last.

**Dependencies / relationships**

- Imports all ~24 route modules from `./routes/`.
- Imports `attachUser`, `blockUntilBootstrapped` from `./middleware/auth.js`.
- Imports `errorHandler` from `./middleware/errorHandler.js`.
- Imports `UPLOADS_PATH` from `./middleware/upload.js`.
- Imports `config` from `./config.js`.
- Called by `./index.js` (production) and by test files directly.
- Frontend static assets served from `../public` (relative to `src/`), which is where the Dockerfile copies `frontend/dist`.

**Notes**

Router mount order matters: `authRouter` must precede `blockUntilBootstrapped`. The comment in the source explains why `originalUrl` (not `req.path`) is used in `blockUntilBootstrapped` — `req.path` is stripped by `app.use('/api', ...)` mounting and caused a bug where bootstrap endpoints were being blocked. When adding a new feature router, mount it between the existing feature routers and before the static-file handlers.
