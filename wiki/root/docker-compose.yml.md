# docker-compose.yml

**Purpose**

Defines the production-style two-service Docker Compose stack: the Express application (`app`) and a PostgreSQL 16 database (`db`). It wires together environment variables, named volumes, health checks, and port mappings so the entire stack starts with a single `docker compose up --build` command.

**Key exports / contents**

- `app` service: built from the root `Dockerfile`, exposes port `8088`, depends on `db` being healthy before starting.
  - Environment variables passed through from the host `.env`: `POSTGRES_PASSWORD`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `MERRIAM_WEBSTER_API_KEY`, `SESSION_SECRET`.
  - Hardcoded container-internal paths: `SWORD_MODULES_PATH=/data/sword-modules`, `MD_MODULES_PATH=/data/md-modules`, `PDF_STORAGE_PATH=/data/pdfs`, `BIBLE_MAPS_PATH=/data/bible-maps`.
  - `./uploads` is bind-mounted (not a named volume) so uploaded files survive rebuilds without being buried in a volume.
  - `./biblicaopenbiblemaps` is bind-mounted read-only as `/data/bible-maps` (git submodule).
- `db` service: `postgres:16-alpine`, database name `bible_study`, user `bible`, password from `POSTGRES_PASSWORD` (defaults to `bible` if unset).
  - Health check: `pg_isready -U bible -d bible_study`, 5 s interval, 10 retries — `app` will not start until this passes.
- Named volumes: `sword_modules`, `md_modules`, `pdf_storage`, `pg_data` — all persist across container restarts and rebuilds.

**Dependencies / relationships**

Consumed by `docker compose up`. Depends on the root `Dockerfile` for building the `app` image. Depends on `.env` (copied from `.env.example`) for secret injection. The `DATABASE_URL` constructed here (`postgresql://bible:PASSWORD@db:5432/bible_study`) must match `backend/src/config.js` expectations.

**Notes**

`restart: unless-stopped` on both services means the stack auto-recovers after host reboots. The `app` service's `depends_on` uses `condition: service_healthy` (not just `service_started`), which prevents race conditions where the backend tries to run Prisma migrations before Postgres is actually ready.
