<p align="center">
  <img src="frontend/public/logo.png" alt="Scriptorium" width="140">
</p>

<h1 align="center">Scriptorium</h1>
<p align="center">A self-hosted, multi-user Bible study platform built on the CrossWire SWORD engine.</p>

Scriptorium started as a personal SWORD reader and has grown into a small
community platform: real Bible/commentary/dictionary text from SWORD, an
LLM study assistant that's grounded in structured context instead of a bare
question, and social layers on top — friends, study groups, a feed, and
guided multi-week studies — all running from one Docker container you host
yourself.

## What's in here

- **Reader** — tiled, tabbed windows for Bibles, commentaries, and
  dictionaries, with linked navigation, Strong's numbers, cross-references,
  footnotes, and clickable references embedded in commentary prose.
- **Study Assistant** — an AI chat panel that's automatically fed whatever
  passages/commentaries you have open, plus any notes you attach, rather
  than requiring you to paste context in by hand. Word Study and Phrase
  Study are the same idea aimed at a single Greek/Hebrew word or an exact
  phrase.
- **Notes** — freestanding or anchored to a passage, full markdown editor,
  searchable, with a one-click "save as note" on any assistant reply.
- **Personal modules** — your own commentary entries or dictionary
  definitions, saved and looked up exactly like a real SWORD module.
- **PDF library** — upload and search reference PDFs alongside the Bible
  text and your notes.
- **Accounts & admin** — single-admin bootstrap on first run, additional
  user accounts, per-module visibility controls, instance branding (the
  app's display name), and a metrics dashboard.
- **Fellows, Scriptoriums, Wall, Studies** — the social layer: friend
  ("fellow") connections, public or invite-only study groups
  (Scriptoriums), a post/comment feed (personal, group, or home), and
  structured multi-week Studies with lessons, progress tracking, comments,
  attached resources, and AI-drafted lesson outlines.

## Stack

- **Backend**: Node.js/Express + [`node-sword-interface`](https://github.com/ezra-bible-app/node-sword-interface)
  (native bindings to the real `libsword` engine — same one used by Ezra Bible App)
- **Database**: Postgres via Prisma — users, notes, highlights, bookmarks,
  PDF metadata, personal modules, connections, scriptoriums, wall
  posts/comments, and studies/lessons/progress
- **Frontend**: React + Vite + Tailwind, served by the same container as the API
- **Auth**: cookie sessions, bcrypt-hashed passwords, single-admin bootstrap flow
- **LLM**: Anthropic API, wired through a provider-agnostic context builder,
  used by the Study Assistant, Word/Phrase Study, and AI-generated study
  lesson drafts

## Running it

```bash
cp .env.example .env
# edit .env: set POSTGRES_PASSWORD and SESSION_SECRET,
# plus ANTHROPIC_API_KEY if you want the AI features (Study Assistant,
# Word/Phrase Study, AI-drafted study lessons)

docker compose up --build
```

Then open **http://localhost:8088**.

⚠️ **First build will be slow.** `node-sword-interface` compiles the
SWORD C++ engine from source during `npm install` — expect several
minutes on the first `docker compose build`, even though rebuilds
after that are fast (Docker layer caching keeps the compiled engine
unless `backend/package.json` changes).

## First run

1. **Bootstrap the admin account.** The app detects there's no user yet
   and prompts you to create the first account, which becomes the
   instance admin (`isAdmin: true`). Every user after that signs up as a
   regular account.
2. **Install a Bible module.** There's no text bundled — as the admin,
   open **Settings → Admin → Manage modules**, pick a repository (fetched
   live from CrossWire etc.), pick a module (e.g. KJV, ASV), and install.
   It downloads into the `sword_modules` Docker volume, so it survives
   rebuilds. Commentaries and dictionaries install the same way.
3. Click the installed module to make it active in the reader.

Regular (non-admin) users can read whatever modules the admin has made
available (see **Module visibility**, below); installing new modules and
uploading PDFs both require admin.

## Reading and searching multiple verses, chapters, and selections

`swordService.getPassage(module, humanReference)` handles anything
`bible-passage-reference-parser` can parse:

- Single verse: `John 3:16`
- Range: `Romans 8:28-30`, cross-chapter ranges like `John 3:16-4:2`
- Whole chapter: `John 3`
- Whole book: `Jude`
- Comma-separated selections: `John 3:16, 18` or `John 3:16-18, Romans 8:28`

The search bar also detects when what you typed is itself a valid
reference and offers a direct "go to passage" jump above the keyword
matches. A single search hits Bible text, your PDF library, and your own
notes at once.

## Panes: tiling, tabs, and windows

The reading area is a small window manager, not one fixed pane:

- A **window** has a kind (Bible / Commentary / Dictionary), a reading
  position, and one or more **tabs**, each an open module. Opening a
  second translation adds a tab to the existing Bible window rather than
  a new window.
- **Tile / Tabs** in the header arranges *windows* side by side or as
  full-width tabs; the tab strip inside each window switches between
  translations/commentaries.
- **The colored dot** on each window's header is its sync group (cycles
  none → A → B → C). Windows sharing a group navigate together — the
  default Bible + Commentary windows start in group A, so a commentary
  follows the Bible out of the box, and you can regroup windows if you
  open more than one Bible.
- Dictionaries get their own pane type (`DictionaryPane`) with a
  filterable list of entries, since they aren't verse-keyed.
- The version dropdown renders through a React portal so it's never
  clipped by a pane's own scroll container, and works on any tab, not
  just "+".

## Word-level detail: Strong's, cross-references, footnotes

- **Every Strong's-tagged word is clickable**, showing definition,
  transcription, and "see also" cross-references. Handles words mapped to
  more than one Strong's number.
- **Cross-references** collapse into small lettered superscript markers
  (matching the module's own `xref.A`/`xref.B` labeling) instead of
  breaking up the reading text; clicking one lists every reference with
  an "open in tab" button.
- **Footnotes** (translator's notes) get the same treatment with numeric
  markers, showing the note text directly without a network round-trip.
- **Chapter/section headings** are pulled out of the verse text and
  rendered as real headings instead of running into the reading text.
- **Bible references embedded in commentary or dictionary prose** are
  detected and made clickable, opening a verse popup with an "open in
  tab" button for a one-off lookup.

## Notes and text selection

Select any text — Bible, commentary, or dictionary entry — and a "+ note"
button appears at the selection, saving a note that carries the exact
quoted text. Notes can be anchored to a passage or freestanding (a
personal journal entry), are edited with a full markdown editor, and are
searchable from the Notes panel or the main search bar.

## Study Assistant, Word Study, and Phrase Study

- **Study Assistant** is a persistent chat panel fed by whatever's
  actually open across every window — passages, commentaries — rebuilt
  right before each message, plus any freestanding notes you pick to
  attach. "Save as note" on any reply creates a note from that answer.
- **Word Study** takes a Strong's-tagged word and asks the assistant about
  it using the dictionary gloss and every occurrence of that word across
  the whole Bible in that module as context.
- **Phrase Study** does the same for a selected phrase or an exact
  sequence of Strong's numbers (so it can match on the original words
  rather than English wording).

All three require an `ANTHROPIC_API_KEY` and a logged-in account — they
call the Anthropic API on your behalf, which costs real money per use.

## Personal modules

Your own commentary notes or dictionary definitions can be saved as a
"personal module" — a private, per-user module that reads back through
the exact same reader/dictionary UI as a real SWORD module (personal
commentary entries even support range-overlap matching, so a note saved
about "John 3:16-18" surfaces when you're just reading verse 17).

## PDF library

Admins can upload reference PDFs; anyone can browse and search the
library. Search is a basic case-insensitive query today — fine for a
personal library, with the query surface isolated in
`pdfService.searchDocuments` for an easy swap to Postgres full-text
search later.

## Accounts, fellows, and the social layer

- **Fellows**: send/accept/decline connection requests, search for other
  users, and see your connections — the basis for the home feed and for
  scriptorium invites.
- **Wall**: every user has a personal wall of posts and comments; there's
  also a home feed (posts from your fellows) and a per-scriptorium wall.
- **Scriptoriums**: study groups that can be public (anyone can browse and
  join) or invite-only. Each has membership management, an owner who can
  update/delete it or remove members, and its own wall and Studies tab.
- **Studies**: structured, multi-week studies that live inside a
  scriptorium (or standalone) — lessons, join/leave, per-lesson
  completion tracking with an overall progress view, threaded comments
  with likes, and attached resources (files or links). A study's owner
  can also ask the assistant to draft a set of weekly lesson outlines for
  a topic, which get created as real (editable) lessons rather than just
  displayed as text.

## Admin and branding

- **Admin dashboard**: DB health, user counts, and content metrics.
- **Module visibility**: per-module toggle for whether a regular user can
  see an installed Bible/commentary/dictionary module; anything never
  toggled defaults to available.
- **Branding**: the instance's display name is stored server-side and
  shown to every visitor, including anonymous ones — editable by the
  admin from Settings.

## Auth model

- First run bootstraps a single admin account; every other account is a
  normal user, created by an admin or via sign-up (see `authService.js`
  for exactly which is enabled).
- Sessions are cookie-based; `requireLogin`/`requireAdmin` middleware
  gate entire routers (fellows, scriptoriums, wall, studies, notes, the
  AI features, admin, and personal-module writes) rather than individual
  routes, so a new route added to one of those files can't accidentally
  ship unprotected.
- Reading installed Bible/commentary/dictionary text and browsing the PDF
  library stay public by default; almost everything that creates content
  or costs API money requires login.
- Login attempts and the bootstrap endpoint are both rate-limited.

## What's scaffolded vs. what needs finishing

- **Module install progress** is currently synchronous (the HTTP request
  blocks until the download finishes). Larger modules will want a
  progress stream (SSE/WebSocket) instead.
- **PDF search** uses a basic `ILIKE` query — swap in Postgres full-text
  search once the library grows.
- **Context builder's note scoping**: the Study Assistant auto-includes
  notes anchored to the open reference, and that lookup still needs to be
  scoped by `userId` inside `contextBuilder.js` to fully match the
  per-user ownership added elsewhere (flagged with a comment there).
- **Commentary key matching**: some commentary module types are keyed
  differently in SWORD than Bible text and may need a small adapter,
  flagged with a comment in `contextBuilder.js`.
- If you expose this beyond your own network, put it behind a reverse
  proxy (TLS) in front of the existing login — there's no built-in
  protection against being placed directly on the open internet.

## Project layout

```
backend/
  src/
    routes/          one file per API area: auth, admin, bible, dictionary,
                      strongs, search, modules, personal-modules, notes,
                      context, phrase-study, word-study, pdf, branding,
                      connections, scriptoriums, studies, wall
    services/        swordService, contextBuilder, pdfService, authService,
                      connectionService, scriptoriumService, studyService,
                      wallService, personalModuleService,
                      moduleVisibilityService, brandingService,
                      metricsService, referenceParser
    middleware/       auth.js (requireLogin/requireAdmin), errorHandler.js
    db/prisma.js
  prisma/schema.prisma, prisma/migrations/
frontend/
  public/logo.png
  src/
    components/      ReaderPane, DictionaryPane, ModuleManager, Library,
                      NotesSidebar, StudyAssistant, AICompanionView,
                      HomeView, FellowsView, ScriptoriumsView,
                      ProfileWallView, StudiesView, StudyMode, AdminView,
                      SettingsView, LoginModal, BootstrapScreen, and more
    hooks/           useAuth, useTabbedWindow, useResizableWidth/Height
    api/client.js    thin fetch wrapper — one function per backend endpoint
```

## Design notes

Dark ink/parchment palette (not the usual cream-and-terracotta AI
default) with a brass accent for primary actions and a verdigris accent
for cross-references/annotations. The signature UI element is the
"marginalia tick" in the reader gutter — a small angled mark evoking a
scribe's cross-reference notation, used to flag verses with notes or open
study threads.