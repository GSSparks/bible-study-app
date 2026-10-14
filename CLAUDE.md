# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Scriptorium** is a self-hosted, multi-user Bible study platform. It wraps the CrossWire SWORD engine (via `node-sword-interface`) for Bible/commentary/dictionary/book text, integrates Claude for an LLM-powered study assistant, and includes social features (study groups called Scriptoriums, a post/comment feed, and multi-week structured studies).

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
- `MD_MODULES_PATH` — Default: `/data/md-modules` — directory for Markdown/ThML modules (see below)
- `PORT` — Default: `8088`

## Markdown & Book Modules

Markdown modules let you add commentaries, dictionaries, Bible texts, or prose books without compiling a SWORD module. Each module is a directory under `MD_MODULES_PATH` with:

```
my-commentary/
  module.json          ← { "name": "...", "description": "...", "type": "COMMENTARY" }
  john.md              ← content keyed by ## chapter:verse headings
  genesis.md
```

Module types: `COMMENTARY`, `DICT`, `BIBLE`, `BOOK`. They appear in the appropriate pickers alongside SWORD modules (prefixed `md:` internally).

**Commentary/Bible file format** — one file per book, named by lowercase book name (`john.md`, `1corinthians.md`):
```markdown
## 3:16
For God so loved the world...

## 3:17
For God did not send his Son...
```
Use `## chapter` (e.g., `## 3`) for chapter-level content that appears as a fallback when no verse match exists.

**Dictionary file format** — `## Entry Name` sections in any `.md` file in the module dir, OR one file per entry (filename = key).

**Book file format** — prose `.md` files (the TOC is auto-generated from headings), or a single `.xml` file in CCEL ThML format:
```
letters-to-seven-churches/
  module.json          ← { "type": "BOOK", ... }
  letters.xml          ← CCEL ThML source
```
ThML `<div1>`/`<div2>` elements are converted to `<section>` wrappers; existing `<h1>`–`<h3>` heading elements inside each div are left in place (do not emit a redundant heading from the `div1 title=""` attribute).

MD commentary modules are automatically included in the Passage Guide AI context.

## Architecture

### Backend (`backend/src/`)

Node.js 20 ES-module Express app. Entry point: `src/index.js`.

**Key layers:**
- `routes/` — Thin Express routers, each maps to a feature domain (~24 files). `requireLogin`/`requireAdmin` middleware gates entire routers, not individual routes.
- `services/` — Business logic. Route handlers call services; services call Prisma and `swordService`.
- `db/prisma.js` — Singleton Prisma client.
- `middleware/auth.js` — Session attachment, `requireLogin`, `requireAdmin`.

**SWORD integration:** `services/swordService.js` wraps `node-sword-interface`. Bible/commentary/dictionary text is fetched via this service. Strong's markup is toggled with `sword.enableMarkup()`. Word/Phrase Study builds a full-Bible index on first request per module and caches it in memory.

**GenBook (RawGenBook) support:** SWORD "General Books" modules use a binary tree format (`.bnt` + `.bdt` files). `swordService._parseBntTree` reads the binary name tree by byte-offset navigation; `getFullBookContent` DFS-traverses the tree and concatenates all node content. `_detectBookModules` identifies book modules (SWORD exposes them as type `"Generic Books"`). `isGenBookModule` checks a single module.

**LLM integration:** `services/contextBuilder.js` assembles passage text, commentary, and user notes into context for Claude. The study assistant supports a tool-use loop where Claude can call `get_passage` to fetch additional verses mid-response. See `routes/context.js` and `routes/wordStudy.js`.

### Frontend (`frontend/src/`)

React 18 + Vite + Tailwind CSS. API calls go through `api/client.js` (fetch-based wrapper).

**Key components:**
- `AppShell.jsx` — Root layout, sidebar navigation, view dispatcher. Owns `bookReader` state (shared between Books view and Book Reader panel), `biblePanelOpen`/`bookPanelOpen` toggles, and all cross-view deep-link state.
- `CellView.jsx` — The Cell reading environment. Hosts `WorkspaceLayout` (the window manager) and all Cell-specific state (focused reference, nav history, drawers).
- `WorkspaceLayout.jsx` — Drag-and-drop pane tiling; columns × rows of typed windows with resizable dividers.
- `MainLayout.jsx` — Fixed three-pane layout (Bible top-left, Dictionary bottom-left, Commentary right) used inside each Cell window.
- `StudyAssistant.jsx` — AI chat panel.
- `BookPane.jsx` — Prose book reader with: auto-generated sliding TOC sidebar, text-selection colour highlights (persisted as notes, re-applied by text matching), inline note markers with hover tooltips.
- `BookPanel.jsx` — Slide-in panel (660px, always mounted) for quick book access from any view. Ctrl+K to toggle. Shares `bookReader` state with `BooksView`.
- `BooksView.jsx` — Full-page Books nav view: book list sidebar + `BookPane`.
- `BiblePanel.jsx` — Slide-in Bible panel (500px, always mounted). Ctrl+B to toggle.

**State:** No global state library. State lives in component hooks. Reader tab/window state is managed via `hooks/useTabbedWindow.js`. Pane widths use `hooks/useResizableWidth.js`. Every open tab stays mounted; CSS toggles visibility to preserve scroll position and tab state.

**Key utilities:**
- `utils/bookHtml.js` — `extractToc(html)` scans h1–h4 and `.book-section-heading` elements, injects stable `bk-*` anchor IDs, returns `{ html, toc }`. `applyHighlightsToContainer` and `applyNoteMarkersToContainer` re-apply persisted annotations by text matching after content renders.
- `utils/dictHtml.js` — `injectTocLinks` detects and processes ISBE-style inline tables of contents in dictionary entries.

### Database (Prisma + PostgreSQL 16)

Schema at `backend/prisma/schema.prisma`. Key models:

| Model | Purpose |
|---|---|
| `User` | Auth, roles (user/admin) |
| `Note` | User annotations — anchored to a reference+module or freestanding. `tags: ['book-highlight', color]` identifies book colour highlights (stored here rather than in the Highlight model, which is verse-keyed). |
| `Highlight` | Verse-level highlights keyed to `reference` + `module` + `color` |
| `Bookmark` | Saved positions keyed to `reference` + `module` |
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
2. Add a nav entry in `AppShell.jsx`'s `NAV_GROUPS` array and a mount point in the `<main>` block
3. Add API methods to `frontend/src/api/client.js`

## Patterns to Know

**Always-mounted views:** `CellView`, `BooksView`, `ScriptoriumsView`, `LibraryView`, `BiblePanel`, `BookPanel` are always mounted with CSS toggling visibility — never conditionally rendered. This preserves tab state, scroll position, and in-flight requests across navigation. Don't change these to conditional renders.

**Book highlights vs. verse highlights:** Verse highlights live in the `Highlight` model, keyed by Bible reference. Book highlights are stored as `Note` records with `tags: ['book-highlight', color]` and `reference: 'book-highlight:MODULE'`, because they need the `quote` field for text-based re-application. Query them with `GET /api/notes?prefix=book-highlight:MODULE`.

**ThML parsing:** `mdModuleService.parseThml` converts CCEL ThML XML to HTML. `<div1>`/`<div2>` become plain `<section>`/`<div>` wrappers — do not extract titles from the `title=""` attribute, because the XML already contains `<h1>`–`<h3>` child elements that serve as headings. Extracting both causes duplicate TOC entries.

**Module type naming:** SWORD uses `"Generic Books"` (the `type` field on module objects) and `"GENBOOK"` (the `getAllRepoModules` filter string) for book modules. Internally the app uses `"BOOK"`. `swordService.listInstalledModules('BOOK')` handles the translation.

## Known Limitations

- Module installation is synchronous; large SWORD modules block the request (no SSE/WebSocket progress yet).
- PDF search uses basic `ILIKE`; not yet upgraded to Postgres full-text search.
- No built-in TLS — deploy behind a reverse proxy if exposed publicly.
- Book highlight re-application uses first-match text search; highlights on duplicate text passages always land on the first occurrence.
