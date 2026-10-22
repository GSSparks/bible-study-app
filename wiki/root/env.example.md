# .env.example

**Purpose**

Template environment file that operators copy to `.env` before running the application. It lists every configurable variable with inline documentation about which are required, which are optional, and where to obtain API keys. The file contains no real secrets — all sensitive values are left blank or set to placeholder strings.

**Key exports / contents**

- `POSTGRES_PASSWORD=change_me` — Required. Password for the `bible` PostgreSQL user. Must be changed before deployment.
- `ANTHROPIC_API_KEY=` — Optional but required for all AI features (Study Assistant, Word Study, Codex AI Overview, lesson drafting). Left blank to allow running without AI.
- `ANTHROPIC_MODEL=claude-sonnet-4-6` — Default model. Can be overridden to any valid Anthropic model identifier.
- `MERRIAM_WEBSTER_API_KEY=` — Optional. Enables the Merriam-Webster dictionary source in the Codex panel. Free Collegiate Dictionary key available at `dictionaryapi.com/register/index`.
- `MD_MODULES_PATH=/data/md-modules` — Commented out (uses default). Override to point at a custom Markdown modules directory on the host.
- `BIBLE_MAPS_PATH=./biblicaopenbiblemaps` — Commented out with a local-dev note. Docker Compose sets this automatically; only needed when running the backend outside Docker.
- `SESSION_SECRET` is notably absent — it must be generated (`openssl rand -hex 32`) and set manually; `backend/src/config.js` will refuse to start without it.

**Dependencies / relationships**

Copied to `.env` and loaded by `dotenv` in `backend/src/config.js`. The variables it defines are consumed by `docker-compose.yml` (which passes them into the container) and directly by `config.js` at process start. Keep in sync with the environment variable table in `README.md`.

**Notes**

`SESSION_SECRET` is intentionally absent from this file — it cannot have a safe placeholder. Operators must generate a unique value. Running the server with a missing or weak session secret is blocked at startup by a hard error in `config.js`.
