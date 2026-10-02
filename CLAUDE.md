# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Scriptorium** is a self-hosted, multi-user Bible study platform. It wraps the CrossWire SWORD engine (via `node-sword-interface`) for Bible/commentary/dictionary text, integrates Claude for an LLM-powered study assistant, and includes social features (fellows/connections, study groups called Scriptoriums, a post/comment feed, and multi-week structured studies).

## Development Commands

### Running the Full Stack

The canonical development setup runs the database via Docker and both servers locally:

```bash
# Start the PostgreSQL database
docker compose up db -d

# Backend (from /backend)
npm run dev

# Frontend (from /frontend) — proxies /api to :8088
npm run dev
```

### Backend Scripts (run from `backend/`)

```bash
npm start                    # Production
npm run dev                  # Watch mode
npm run prisma:generate      # Regenerate Prisma client after schema changes
npm run prisma:migrate       # Deploy pending migrations (production)
npm run prisma:migrate:dev   # Create and apply a new migration (development)
```

### Frontend Scripts (run from `frontend/`)

```bash
npm run dev      # Vite dev server on :5173
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

### Full Docker Build

```bash
docker compose up --build
```

First build is slow due to native C++ compilation of the SWORD library. Subsequent builds use Docker layer caching.

## Environment Variables

Copy `.env.example` to `.env`. Required:
- `POSTGRES_PASSWORD` — PostgreSQL password
- `SESSION_SECRET` — Generate with `openssl rand -hex 32`

Optional but enables core features:
- `ANTHROPIC_API_KEY` — Required for Study Assistant, Word Study, AI lesson drafting
- `ANTHROPIC_MODEL` — Default: `claude-sonnet-4-6`
- `SWORD_MODULES_PATH` — Default: `/data/sword-modules`
- `PDF_STORAGE_PATH` — Default: `/data/pdfs`
- `PORT` — Default: `8088`

## Architecture

### Backend (`backend/src/`)

Node.js 20 ES-module Express app. Entry point: `src/index.js`.

**Key layers:**
- `routes/` — Thin Express routers, each maps to a feature domain (~22 files). `requireLogin`/`requireAdmin` middleware gates entire routers, not individual routes.
- `services/` — Business logic. Route handlers call services; services call Prisma and `swordService`.
- `db/prisma.js` — Singleton Prisma client.
- `middleware/auth.js` — Session attachment, `requireLogin`, `requireAdmin`.

**SWORD integration:** `services/swordService.js` wraps `node-sword-interface`. Bible/commentary/dictionary text is fetched via this service. Strong's markup is toggled with `sword.enableMarkup()`. Word/Phrase Study builds a full-Bible index on first request per module and caches it in memory.

**LLM integration:** `services/contextBuilder.js` assembles passage text, commentary, and user notes into context for Claude. The study assistant supports a tool-use loop where Claude can call `get_passage` to fetch additional verses mid-response. See `routes/context.js` and `routes/wordStudy.js`.

### Frontend (`frontend/src/`)

React 18 + Vite + Tailwind CSS. API calls go through `api/client.js` (fetch-based wrapper).

**Key components:**
- `AppShell.jsx` — Root layout, sidebar navigation, view dispatcher.
- `StudyMode.jsx` — Reader window manager. Multiple resizable panes (Bible, Commentary, Dictionary) with tabs per pane. Sync groups (colored dots) tie windows for synchronized navigation.
- `MainLayout.jsx` — Pane tiling and resizing logic.
- `StudyAssistant.jsx` — AI chat panel.

**State:** No global state library. State lives in component hooks. Reader tab/window state is managed via `hooks/useTabbedWindow.js`. Pane widths use `hooks/useResizableWidth.js`. Every open tab stays mounted; CSS toggles visibility to preserve scroll position.

### Database (Prisma + PostgreSQL 16)

Schema at `backend/prisma/schema.prisma`. Key models:

| Model | Purpose |
|---|---|
| `User` | Auth, roles (user/admin) |
| `Note / Highlight / Bookmark` | User annotations keyed to Bible reference + module |
| `StudySession` | Conversation history for study assistant (messages stored as JSON) |
| `PersonalModule / PersonalEntry` | User-created private commentary/dictionary entries |
| `Document` | PDF metadata + extracted text (capped 200K chars) |
| `Connection` | Fellow requests — one row per pair, bidirectional |
| `Scriptorium / ScriptoriumMembership` | Study groups |
| `Post / Comment` | Wall feed (personal or Scriptorium) |
| `Study / StudyLesson / StudyParticipant` | Multi-week structured studies with per-lesson progress |
| `StudyResource` | Footer resources attached to study lessons (commentary/link/note types) |
| `AppSetting` | Key-value config (branding, bootstrap marker) |
| `ModuleVisibility` | Admin toggles per-module availability for regular users |

After any schema change: run `npm run prisma:migrate:dev` (dev) or `npm run prisma:migrate` (prod), then `npm run prisma:generate`.

### Authentication

- First-run bootstraps a single admin account (Prisma transaction, race-condition safe).
- Cookie sessions backed by PostgreSQL (`connect-pg-simple`).
- Passwords: argon2 hashing, min 10 chars, constant-time dummy-hash check prevents username enumeration.
- Session ID regenerated on login (session fixation mitigation).
- Rate limiting: 10 login attempts/15 min, 5 bootstrap attempts/hour.

### UI Design Tokens

Defined in `frontend/tailwind.config.js`:
- Background: dark ink `#0D1B29`, parchment `#F5F4F1`
- Reading surfaces: `#EDE6D3`
- Accent: brass `#E8A441`, cross-ref teal `#3F7168`
- Fonts: Source Serif 4 (display), IBM Plex Sans (UI), IBM Plex Mono

## Adding a New Feature

**Backend route:**
1. Create `backend/src/routes/myfeature.js` + `backend/src/services/myfeatureService.js`
2. Mount the router in `backend/src/index.js`
3. Add any new Prisma models to `schema.prisma`, then run migrate + generate

**Frontend view:**
1. Create `frontend/src/components/MyFeatureView.jsx`
2. Add a nav entry and routing case in `AppShell.jsx`
3. Add API methods to `frontend/src/api/client.js`

## Known Limitations

- Module installation is synchronous; large SWORD modules block the request (no SSE/WebSocket progress yet).
- PDF search uses basic `ILIKE`; not yet upgraded to Postgres full-text search.
- No built-in TLS — deploy behind a reverse proxy if exposed publicly.
- Messages/Notifications are scaffolded in the nav but not yet implemented.
