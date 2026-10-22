# CLAUDE.md

**Purpose**

The primary AI-developer instruction file for the Scriptorium project. It describes the project at a high level, documents all development commands, explains architecture decisions, lists environment variables, and enumerates patterns that Claude Code must follow when making changes. It is the single authoritative source of truth for AI-assisted work in this repository.

**Key exports / contents**

- Project overview: Scriptorium is a self-hosted multi-user Bible study platform using the CrossWire SWORD engine, Anthropic Claude LLM, and PostgreSQL.
- Development commands: `docker compose up db -d`, `npm run dev` for both frontend and backend, Prisma migration scripts.
- Environment variables: `POSTGRES_PASSWORD`, `SESSION_SECRET` (required); `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `SWORD_MODULES_PATH`, `PDF_STORAGE_PATH`, `MD_MODULES_PATH`, `PORT` (optional).
- Markdown module format: how to drop `.md` or ThML `.xml` directories into `MD_MODULES_PATH` for commentaries, dictionaries, Bible texts, and books.
- Backend architecture: routes → services → Prisma/swordService layering, SWORD integration, GenBook binary-tree parsing, LLM tool-use loop.
- Frontend architecture: React 18 + Vite + Tailwind, component inventory, always-mounted view pattern, state management approach.
- Database model summary table: all 20+ Prisma models and their purpose.
- Authentication details: argon2, session fixation mitigation, rate limiting.
- UI design tokens: colour palette, typography.
- "Adding a New Feature" step-by-step for both backend routes and frontend views.
- Patterns to know: always-mounted views, book vs. verse highlights, ThML parsing, SWORD module type naming.
- Known limitations: synchronous module install, basic PDF search, no TLS, first-match-only book highlights.

**Dependencies / relationships**

Read by Claude Code on every session. References virtually every file in the project. Cross-references `backend/src/index.js`, `backend/prisma/schema.prisma`, `frontend/src/components/AppShell.jsx`, `frontend/tailwind.config.js`, and many service files.

**Notes**

This file doubles as onboarding documentation for human developers. The "Patterns to Know" section is especially important — it captures non-obvious design decisions (e.g. why book highlights are stored as `Note` records, not `Highlight` records) that would otherwise cause regressions.
