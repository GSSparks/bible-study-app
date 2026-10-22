# Dockerfile

**Purpose**

Multi-stage Dockerfile that produces a single production image containing the compiled React frontend, the Node.js backend, and all native SWORD engine binaries. Three named stages keep the final runtime image lean by discarding build toolchains after use.

**Key exports / contents**

- **Stage 1 — `frontend-build`** (`node:20-bookworm`): Installs frontend dependencies and runs `npm run build`, producing a static `dist/` directory.
- **Stage 2 — `backend-build`** (`node:20-bookworm`): Installs native build tools (`build-essential`, `cmake`, `pkg-config`, `subversion`, `libcurl4-gnutls-dev`, `zlib1g-dev`, `git`) needed to compile `node-sword-interface` from source. Runs `npm install --omit=dev` and `npx prisma generate`.
- **Stage 3 — `runtime`** (`node:20-bookworm`): Copies compiled backend and frontend from prior stages. Installs only runtime native libs: `libcurl4-gnutls-dev`, `tesseract-ocr` + `tesseract-ocr-eng` (PDF OCR), `poppler-utils` (PDF-to-image), `antiword` (doc extraction). Copies `modules/` as `seed-modules/`.
- **CMD**: `npx prisma migrate deploy && node src/scripts/seedModules.js && node src/index.js` — runs migrations, seeds starter modules, then starts the server.
- Exposes port `8088`, sets `NODE_ENV=production`.

**Dependencies / relationships**

Built by `docker compose up --build` via `docker-compose.yml`. Relies on `backend/package.json` for the dependency install step — changing that file invalidates the slow SWORD compilation layer. The `modules/` directory at the repo root provides seed zip files copied into the image. The `biblicaopenbiblemaps/` submodule is NOT baked into the image — it is volume-mounted at runtime via `docker-compose.yml`.

**Notes**

The SWORD compilation step (Stage 2) is the dominant build cost — expect several minutes on first build. Docker layer caching means this only re-runs if `backend/package*.json` changes. The three-stage approach is essential: including the full C++ toolchain in the runtime image would roughly triple image size.
