# backend/package.json

**Purpose**

Declares the backend Node.js package, its npm scripts, and all runtime and development dependencies. It configures the package as an ES module (`"type": "module"`), which means all `.js` files use `import`/`export` syntax rather than `require`.

**Key exports / contents**

- `"type": "module"` — ES module mode throughout the backend.
- Scripts:
  - `start` — `node src/index.js` (production)
  - `dev` — `node --watch src/index.js` (development hot-reload)
  - `prisma:generate` — `prisma generate`
  - `prisma:migrate` — `prisma migrate deploy` (production)
  - `prisma:migrate:dev` — `prisma migrate dev` (development, creates new migrations)
  - `test` — `vitest run`
  - `test:watch` — `vitest`
  - `test:coverage` — `vitest run --coverage`
- Production dependencies:
  - `@anthropic-ai/sdk ^0.32.0` — Claude LLM integration
  - `@prisma/client ^5.20.0` — PostgreSQL ORM client
  - `adm-zip ^0.6.0` — ZIP extraction for module uploads and seeding
  - `argon2 ^0.45.1` — password hashing
  - `bible-passage-reference-parser ^3.2.0` — flexible Bible reference parsing
  - `connect-pg-simple ^10.0.0` — PostgreSQL session store
  - `cors`, `dotenv`, `express`, `express-rate-limit`, `express-session`, `helmet` — HTTP server stack
  - `marked ^18.0.9` — Markdown-to-HTML conversion for MD modules
  - `multer ^2.0.0` — multipart file uploads
  - `node-sword-interface ^1.0.124` — native C++ bindings to the SWORD Bible engine
  - `mammoth ^1.8.0` — DOCX/DOC text extraction
  - `pdf-parse ^1.1.1` — PDF text extraction
- Dev dependencies:
  - `prisma ^5.20.0` — CLI for migrations and codegen
  - `vitest ^2.0.0` + `supertest ^7.0.0` + `@vitest/coverage-v8 ^2.0.0` — test framework

**Dependencies / relationships**

Consumed by `npm install` in the backend directory and in the Dockerfile Stage 2. `node-sword-interface` is the most significant dependency — it compiles native C++ SWORD bindings and requires the build toolchain. The `vitest.config.js` file configures the test runner referenced by the `test` scripts.

**Notes**

`node-sword-interface` version pinning is important — the native ABI can break across minor versions. `mammoth` and `pdf-parse` enable the PDF library's text extraction pipeline in `pdfService.js`. `adm-zip` is used both by the admin module upload handler and by `seedModules.js` for the bundled starter MD modules.
