<p align="center">
  <img src="frontend/public/logo.png" alt="Scriptorium" width="140">
</p>

<h1 align="center">Scriptorium</h1>
<p align="center">A self-hosted, multi-user Bible study platform built on the CrossWire SWORD engine.</p>

<p align="center">
  <img src="docs/screenshot.png" alt="Scriptorium study lesson view" width="800">
</p>

Scriptorium is a self-hosted Bible study environment: real text from the SWORD engine (same library behind Ezra Bible App and Xiphos), an LLM study assistant grounded in the passages you actually have open, structured multi-week Studies with AI-drafted lesson outlines, and small-group coordination through Scriptoriums — all from one Docker container.

## What's in here

- **Cell (Reader)** — tiled, tabbed windows for Bibles, commentaries, and dictionaries with linked navigation, Strong's numbers, cross-references, footnotes, and clickable references embedded in commentary prose.
- **AI Companion** — a chat panel fed by whatever passages and commentaries you have open, plus any notes you attach. Word Study and Phrase Study are the same idea aimed at a single Greek/Hebrew word or an exact phrase across the whole Bible.
- **Notes** — freestanding or anchored to a passage, full rich-text editor, searchable, with a one-click "save as note" on any assistant reply.
- **Personal modules** — your own commentary entries or dictionary definitions, saved and looked up exactly like a real SWORD module.
- **PDF library** — upload and search reference PDFs alongside the Bible text.
- **Scriptoriums** — invite-only or public study groups with a group feed (Scroll), an About page, shared Resources (external links), a Members list, and a Daily Devotional sidebar drawn from any installed SWORD Daily-type module.
- **Studies** — structured multi-week studies that live inside a Scriptorium: lessons with leader notes, per-lesson completion tracking, threaded discussion comments with likes, attached resources (commentary passages or links), and AI-drafted lesson outlines for any topic.
- **Admin** — module installation from CrossWire repositories (Bibles, commentaries, dictionaries, daily devotionals), per-module visibility controls, user management, instance branding, and a metrics dashboard.

## Stack

- **Backend**: Node.js/Express + [`node-sword-interface`](https://github.com/ezra-bible-app/node-sword-interface) (native bindings to `libsword`)
- **Database**: PostgreSQL via Prisma — users, notes, highlights, bookmarks, PDF metadata, personal modules, Scriptoriums, Studies/lessons/progress, and group feeds
- **Frontend**: React 18 + Vite + Tailwind CSS, served by the same container as the API
- **Auth**: cookie sessions, argon2-hashed passwords, single-admin bootstrap, rate-limited login
- **LLM**: Anthropic API, used by Study Assistant, Word/Phrase Study, and AI-generated lesson drafts

## Running it

```bash
cp .env.example .env
# edit .env: set POSTGRES_PASSWORD and SESSION_SECRET,
# plus ANTHROPIC_API_KEY if you want the AI features

docker compose up --build
```

Then open **http://localhost:8088**.

⚠️ **First build is slow.** `node-sword-interface` compiles the SWORD C++ engine from source during `npm install` — expect several minutes on first build. Rebuilds are fast (Docker layer caching keeps the compiled engine unless `backend/package.json` changes).

## First run

1. **Bootstrap the admin account.** The app detects there's no user yet and prompts you to create the first account (becomes the instance admin). All subsequent accounts are regular users.
2. **Install Bible modules.** As admin, go to **Admin → Modules**, pick a CrossWire repository, and install a Bible (e.g. KJV, ESV, BSB). Commentaries, dictionaries, and daily devotionals install the same way. Modules download into a Docker volume and survive rebuilds.
3. Open the **Cell** to start reading.

## Reading

`swordService.getPassage` handles anything `bible-passage-reference-parser` can parse:

- Single verse: `John 3:16`
- Range: `Romans 8:28-30`, cross-chapter: `John 3:16-4:2`
- Whole chapter: `John 3`
- Comma-separated: `John 3:16, 18` or `John 3:16-18, Romans 8:28`

The search bar detects when input is a valid reference and offers a direct "go to passage" jump above keyword matches. A single search hits Bible text, PDFs, and your notes at once.

## Panes: tiling, tabs, sync groups

The Cell is a small window manager:

- A **window** has a kind (Bible / Commentary / Dictionary), a position, and one or more **tabs** (open modules). Opening a second translation adds a tab, not a new window.
- **Tile / Tabs** in the header tiles windows side-by-side or stacks them as full-width tabs.
- **The colored dot** on each window's header is its sync group (none → A → B → C). Windows in the same group navigate together — the default Bible + Commentary windows start in group A so commentary follows the Bible automatically.

## Strong's, cross-references, footnotes

- Every Strong's-tagged word is clickable — definition, transcription, "see also" cross-references.
- Cross-references collapse into small lettered superscript markers; clicking one lists every reference with an "open in tab" button.
- Footnotes get numeric markers showing translator's note text without a network round-trip.
- Chapter/section headings are extracted and rendered as real headings.
- Bible references in commentary or dictionary prose are detected and made clickable.

## Notes and text selection

Select any text in the reader and a "+ note" button appears at the selection, creating a note that carries the quoted text. Notes can be anchored to a passage or freestanding, are edited with a rich-text editor, and are searchable from the Notes panel or the main search bar.

## Study Assistant, Word Study, and Phrase Study

- **Study Assistant** — persistent chat fed by whatever's open across every reader window, rebuilt right before each message. "Save as note" on any reply creates a note from that answer.
- **Word Study** — takes a Strong's-tagged word and asks the assistant using the dictionary gloss and every occurrence of that word across the whole Bible as context.
- **Phrase Study** — same for a selected phrase or exact Strong's sequence (matches on the original words, not English translation).

All three require `ANTHROPIC_API_KEY` and a logged-in account.

## Scriptoriums

Study groups with:

- **Scroll** — a shared group feed (posts + comments)
- **About** — rich-text description of the group, editable by the owner
- **Studies** — multi-week structured studies (see below)
- **Resources** — member-submitted external links
- **Members** — owner can invite, remove, or manage membership
- **Daily Devotional sidebar** — shows today's reading from whichever SWORD Daily module the admin has selected (Spurgeon, etc.), visible on the Scriptoriums list page

Scriptoriums can be public (browse and join) or invite-only. Tags on each Scriptorium enable filtering on the list page.

## Studies

Structured studies that live inside a Scriptorium:

- **Lessons** — each lesson has a key verse (opened directly in the Cell with one click), leader study notes, and a personal note editor for the participant.
- **AI lesson drafts** — give the assistant a topic and number of weeks and it drafts a full lesson outline, which becomes a set of real editable lessons (not just displayed text).
- **Progress tracking** — mark lessons complete; a progress ring shows overall completion.
- **Discussion** — threaded comments with likes on each lesson.
- **Resources** — link a commentary passage or external URL to any lesson; the passage content fetches and displays inline.

## Personal modules

Private, per-user commentary notes or dictionary definitions saved through the same UI as SWORD modules. Personal commentary entries support range-overlap matching — a note saved for "John 3:16-18" surfaces when reading verse 17.

## PDF library

Admins upload reference PDFs; anyone can browse and search. Extracted text (capped at 200K chars per doc) is hit by the main search bar alongside Bible text and notes.

## Admin

- **Modules** — install from CrossWire repositories by type (BIBLE, COMMENTARY, DICT, DAILY); per-module visibility toggle for regular users; manual `.zip` upload for offline installs
- **Daily Devotional** — select which installed Daily module shows in the Scriptorium sidebar; the gear icon on the widget opens the picker
- **Users** — create and list user accounts
- **Posts / Media** — moderate content
- **Branding** — set the instance display name
- **Metrics** — DB health and usage counts

## Auth model

- First run bootstraps a single admin account; all other accounts are normal users.
- Sessions are cookie-based with a 30-day rolling window, backed by `connect-pg-simple`.
- `requireLogin`/`requireAdmin` middleware gates entire routers rather than individual routes — a new route added to a guarded file can't accidentally ship unprotected.
- Reading Bible text and the PDF library stays public. Creating content or spending API credits requires login.
- Login attempts and the bootstrap endpoint are both rate-limited.

## Project layout

```
backend/
  src/
    routes/       one file per domain: auth, admin, bible, dictionary, strongs,
                  search, modules, personal-modules, notes, context,
                  phrase-study, word-study, pdf, branding, scriptoriums,
                  studies, wall, users, uploads, devotionals
    services/     swordService, contextBuilder, pdfService, authService,
                  scriptoriumService, studyService, wallService,
                  devotionalService, personalModuleService,
                  moduleVisibilityService, brandingService, metricsService
    middleware/   auth.js (requireLogin/requireAdmin), errorHandler.js, upload.js
    db/prisma.js
  prisma/schema.prisma, prisma/migrations/
frontend/
  src/
    components/   AppShell, CellView, StudyMode, MainLayout, StudyAssistant,
                  AICompanionView, ScriptoriumsView, StudyDetail, LibraryView,
                  DailyDevotional, AdminView, SettingsView, LoginModal, and more
    hooks/        useAuth, useTabbedWindow, useResizableWidth/Height
    api/client.js thin fetch wrapper — one method per backend endpoint
```

## Known limitations

- **Module install is synchronous** — the HTTP request blocks until download finishes. Large modules will want an SSE/WebSocket progress stream.
- **PDF search** uses a basic `ILIKE` query — swap `pdfService.searchDocuments` for Postgres full-text search once the library grows.
- **No built-in TLS** — put a reverse proxy in front before exposing this to the open internet.
- **Context builder note scoping** — study assistant auto-includes notes for the open reference; the lookup in `contextBuilder.js` still needs scoping by `userId` (flagged with a comment there).

## Design

Dark ink/parchment palette with a brass accent for primary actions and a verdigris accent for cross-references and annotations. Source Serif 4 for display text, IBM Plex Sans for UI, IBM Plex Mono for module codes and references.
