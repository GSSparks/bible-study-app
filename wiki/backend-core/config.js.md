# backend/src/config.js

**Purpose**

Loads environment variables via `dotenv` and exports a single typed `config` object used throughout the backend. It also enforces a hard startup failure if `SESSION_SECRET` is missing, preventing the server from ever running in an insecure state where session cookies could be forged.

**Key exports / contents**

- `config` (named export) — plain object with the following keys:
  - `port` — `parseInt(process.env.PORT || '8088', 10)`
  - `nodeEnv` — `process.env.NODE_ENV || 'development'`
  - `swordModulesPath` — `process.env.SWORD_MODULES_PATH || '/data/sword-modules'`
  - `pdfStoragePath` — `process.env.PDF_STORAGE_PATH || '/data/pdfs'`
  - `databaseUrl` — `process.env.DATABASE_URL` (no default — undefined if missing)
  - `anthropicApiKey` — `process.env.ANTHROPIC_API_KEY || null`
  - `anthropicModel` — `process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'`
  - `sessionSecret` — `process.env.SESSION_SECRET` (validated above)
- Guard: throws `Error` with an actionable message if `SESSION_SECRET` is not set.

**Dependencies / relationships**

- Imported by `app.js` (session config, database URL, uploads path), `index.js` (port), and many service files that need `anthropicApiKey`, `anthropicModel`, `swordModulesPath`, or `pdfStoragePath`.
- Loads `.env` via `dotenv/config` side-effect import — only effective when running outside Docker (Docker Compose injects vars directly).

**Notes**

`MD_MODULES_PATH` is notably absent from `config.js` — it is read directly from `process.env` in `mdModuleService.js`. If you add a new environment variable, add it here so all consumers have a single source of defaults and it shows up in `config.js` for discoverability. The `SESSION_SECRET` guard is intentional and must not be weakened.
