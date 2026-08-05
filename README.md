# Scriptorium — a self-hosted Bible study app on SWORD

Web-based Bible study tool built on the CrossWire SWORD engine, with a
module manager, a PDF library, and an LLM study assistant that gets a
structured context (passage + commentary + your notes) rather than
just a bare question.

## Stack

- **Backend**: Node.js/Express + [`node-sword-interface`](https://github.com/ezra-bible-app/node-sword-interface)
  (native bindings to the real `libsword` engine — same one used by Ezra Bible App)
- **Database**: Postgres via Prisma (notes, highlights, bookmarks, PDF metadata, study sessions)
- **Frontend**: React + Vite + Tailwind, served by the same container as the API
- **LLM**: Anthropic API, wired through a provider-agnostic context builder

## Running it

```bash
cp .env.example .env
# edit .env: set POSTGRES_PASSWORD, and ANTHROPIC_API_KEY if you want the study assistant

docker compose up --build
```

Then open **http://localhost:8088**.

⚠️ **First build will be slow.** `node-sword-interface` compiles the
SWORD C++ engine from source during `npm install` — expect several
minutes on the first `docker compose build`, even though rebuilds
after that are fast (Docker layer caching keeps the compiled engine
unless `backend/package.json` changes).

## First run: install a Bible module

There's no text bundled — SWORD modules are fetched from public
repositories (CrossWire, etc.) on demand:

1. Open the app, click **Manage modules**
2. Pick a repository (this list is fetched live), pick a module (e.g. KJV, ASV)
3. Click **install** — it downloads into the `sword_modules` Docker volume, so it survives rebuilds
4. Click the installed module to make it active in the reader

## Reading and searching multiple verses, chapters, and selections

`swordService.getPassage(module, humanReference)` now handles anything
`bible-passage-reference-parser` can parse:

- Single verse: `John 3:16`
- Range: `Romans 8:28-30`, cross-chapter ranges like `John 3:16-4:2`
- Whole chapter: `John 3`
- Whole book: `Jude`
- Comma-separated selections: `John 3:16, 18` or `John 3:16-18, Romans 8:28`

Internally this works by forcing the reference parser into verse-level
precision (`osis_compaction_strategy: 'bcv'`), so "John 3" and "Jude"
resolve the same way a range does — no separate chapter/book code paths
needed. The reader groups the resulting verses into segments, showing a
book/chapter header whenever it changes and a plain divider (⋯) for a
non-contiguous jump within the same chapter (e.g. `John 3:16,18`), plus
prev/next-chapter buttons for continuous reading.

The search bar also now detects when what you typed is itself a valid
reference and offers a direct "go to passage" jump above the keyword
matches — typing `Romans 8:28-30` no longer only searches for those words
in the text.

## Panes: tiling, tabs, and opening commentaries/dictionaries

The reading area is now a small window manager rather than one fixed
pane:

- **Manage modules → pick a type tab (Bibles / Commentaries /
  Dictionaries & help books) → "open"** on any installed module opens it
  in a new pane. Commentaries reuse the same reader as Bible text (SWORD
  keys them the same way — book/chapter/verse); dictionaries and other
  help books get a different pane (`DictionaryPane.jsx`) with a
  filterable list of entries on the left and the raw entry on the right,
  since those aren't verse-keyed.
- **Tile / Tabs toggle** in the header switches between a grid of all
  open panes and a single-pane-plus-tab-bar view.
- Clicking anywhere in a pane makes it the "active" pane — that's the one
  the header search bar, the version switcher, and the Notes/Assistant
  dock on the right all act on. There's always at least one pane; closing
  the last one is a no-op.

## Text-selection notes, clickable verse refs in commentaries, default Bible

- **Select any text (Bible, commentary, or dictionary entry) and a small
  "+ note" button appears** right at the selection — click it to save a
  note that carries the exact selected text (`quote`, a new `Note`
  field, separate from your own commentary in `body`). Built as a
  reusable `SelectableNoteRegion` wrapper so it works the same way in
  `ReaderPane` and `DictionaryPane` rather than being duplicated.
- **Bible references embedded in commentary/dictionary prose are now
  clickable.** Rather than guess at SWORD's own cross-reference markup,
  `swordService.wrapVerseReferences()` runs the same
  `bible-passage-reference-parser` already used elsewhere in the app
  over the rendered text server-side, finds actual citations like "cf.
  John 3:16", and wraps just those substrings in
  `<span class="verse-ref" data-ref="OSIS">` — confirmed it correctly
  leaves bare mentions like "the Gospel of John" alone. Clicking one
  opens a popup with the verse text and an "Open in tab" button, which
  adds it as a new, deliberately *unlinked* tab (so a one-off lookup
  doesn't get dragged around by whatever else you're navigating).
- **Default Bible**: a ★ toggle per installed Bible in the module
  manager, persisted to `localStorage`. Used to fill the very first
  window on load and as the translation for verse-reference popups
  (which need some translation to preview in, since commentary text
  doesn't specify one itself).

One implementation note: getting the verse popup to reuse the existing
passage endpoint (rather than adding a second one) depended on
confirming that the reference parser accepts OSIS-formatted strings
directly as input, not just human-typed ones — verified
(`bcv.parse("John.3.16").osis()` round-trips to itself), so `data-ref`
values can be passed straight through to `getPassage()` unchanged.

## Study assistant: persistence, auto-context, and saving notes

A few real bugs and gaps here, fixed together since they touched the
same code:

- **Conversations disappearing on tab switch** was a plain React bug —
  the Notes/Library/Assistant dock panels were conditionally *rendered*
  (`{dockTab === 'assistant' && <StudyAssistant />}`), which unmounts a
  component and throws away its state every time you switch away. All
  three now stay mounted permanently and are just hidden with CSS
  (`hidden` / `h-full`) when their tab isn't active.
- **Manual context loading is gone.** `StudyAssistant` now takes a
  `sources` prop — every open Bible/commentary tab across every window,
  flattened — computed in `App.jsx` from live window state. Context is
  rebuilt from whatever's actually open right before each message is
  sent, so navigating mid-conversation keeps the assistant current
  without any "load context" step. The backend's `/api/context/build`
  changed shape to match: `{ sources: [{module, reference, kind, title}],
  noteIds? }` instead of a single reference/module pair.
- **Attaching personal notes to a conversation**: a small search-and-pick
  control in the assistant panel lets you pull in specific freestanding
  notes (journal entries not tied to any passage) by id, alongside the
  automatic reference-matched ones.
- **"Save as note"** appears on hover over any assistant reply — one
  click creates a `Note` with `fromAssistant: true` from that reply's
  text, editable afterward in the Notes panel like anything else.

## Notes: freestanding + anchored, full markdown editor, searchable

The `Note` model no longer requires `reference`/`module` — a note can be
anchored to a passage (created from the "This passage" tab) or
freestanding (a personal journal entry, from "All notes"), and both are
edited with `@uiw/react-md-editor` (a real toolbar + live preview, not
just a plain `<textarea>`) and rendered back with the same
`react-markdown` setup used for assistant replies. `GET /api/notes?q=…`
does a case-insensitive search across title + body for the "All notes"
search box, and the same query also feeds into the main search bar's
results.

## Resizable side panel

The Notes/Library/Assistant dock has a drag handle on its left edge
(`useResizableWidth` hook) — width persists across reloads via
`localStorage` (fine here since this is a real deployed app, not a
sandboxed artifact).

## Version dropdown and per-tab linking

Two real bugs here:

- **The version dropdown was barely visible.** It rendered as an
  absolutely-positioned list nested inside a pane that has
  `overflow-hidden` (needed for the pane's own scroll clipping), which
  cut the list off almost entirely — it wasn't "only appearing on click,"
  it was opening and then getting clipped to a sliver. `ModulePicker.jsx`
  now renders the list through a React portal straight into
  `document.body` with `position: fixed` computed from the trigger
  button's actual position, so it always renders on top, fully visible,
  regardless of what it's nested inside.
- **The same picker now works on existing tabs, not just "+".** Every
  tab has its own small "▾" that opens the identical picker, swapping
  that tab's module in place (`onSwapTabModule`) instead of adding a new
  one.
- **Linking moved from window-level to tab-level.** `reference` and
  `syncGroup` now live on each tab instead of the window, so the colored
  link dot sits on each tab individually. This matters once a window has
  more than one tab open: two different commentaries in the same window
  can now follow two different Bible tabs independently, rather than
  every tab in a window being forced into the same link group.

## Windows, tabs, and linking a commentary to a specific Bible window

The reading area redesigned again, this time around a "window" concept
closer to how desktop Bible software (Logos, BibleTime, etc.) handles
this:

- A **window** has a kind (Bible / Commentary / Dictionary), a reading
  position (`reference`), and one or more **tabs** — each tab is one
  open module. Opening a second translation doesn't create a second
  window; it adds a tab to the existing Bible window. Same for
  commentaries. This is what the "+" control inside each window's tab
  strip does — it's the in-window version selector, listing whatever's
  installed and not already open.
- **Tile / Tabs** in the header arranges *windows* (so normally just
  Bible + Commentary + Dictionary, tiled side by side or as full-width
  tabs) — a separate layer from the tabs *inside* a window, which switch
  between translations/commentaries.
- **The colored dot** on each window's header is its sync group (cycles
  none → A → B → C on click). Windows sharing a non-none group navigate
  together — that's the actual answer to "link the right commentary to
  the right Bible window": both start in group A by default (so it works
  out of the box), and if you ever open a second Bible window, you can
  click its dot and the commentary's dot to put them in a different
  shared group instead, so each Bible window can have its own commentary
  following it independently. Dictionary windows aren't reference-based,
  so they don't participate in sync groups at all.

## Markdown rendering

The study assistant's replies are now run through `react-markdown` (with
`remark-gfm` for tables/strikethrough/task lists) instead of being
dumped in as raw text — headers, bold, lists, code blocks, etc. all
render properly now instead of showing literal `##`/`*` characters.
Styling for it lives in `index.css` under `.markdown-body`, since there's
no Tailwind typography plugin installed.

**Update: confirmed and fixed against real output.** You sent the actual
raw `content` for John 3:16 from a KJV+Strong's+morphology module, which
settled this for good instead of another guess. Two real things were
wrong:

1. **Wrong attribute entirely.** Strong's numbers aren't in a `lemma`/
   `savlm` attribute at all — they're in the **`class`** attribute:
   `<w class="strong:G3588 strong:G2316 lemma.TR:ο lemma.TR:θεος"
   morph="robinson:T-NSM robinson:N-NSM">God</w>`. (The `lemma.TR:`
   tokens in there are the underlying Greek/Hebrew text itself — a
   different, unrelated piece of data I'd conflated with the OSIS
   `lemma` *attribute* convention.)
2. **A regex-strategy bug, not just a wrong guess.** Matching on "any
   tag carrying a `class`/`lemma`/`savlm` attribute" also matched the
   *wrapping* `<div>` around the whole verse (it has a `class` too, just
   not a Strong's one) — and since there's only one closing tag for that
   outer element, the non-greedy match had no choice but to consume the
   entire verse, nested `<w>` tags and all, as one unprocessed block.
   Fixed by targeting `<w>` elements directly (confirmed as the real tag
   name, and they don't nest, so this can't happen again).

Verified against the actual sample end-to-end (flatten → normalize →
reference-wrap) before shipping: 12/12 tagged words in that verse
wrapped correctly, including two words that map to more than one
Strong's number ("God" → `G3588,G2316`, "the world" → `G3588,G2889`).

**A second, unrelated bug fell out of the same raw output**: verse
content comes wrapped in a block-level `<div class="sword-markup
sword-quote-jesus">`, which was getting rendered inside the frontend's
inline `<span>` — invalid nesting. `flattenBlockTags()` renames wrapping
`<div>`/`<p>` tags to `<span>` (keeping their classes) before the
Strong's/reference passes run. As a bonus, that `sword-quote-jesus`
class is SWORD's own red-letter (words of Christ) marker, so it's now
usable — added a CSS rule for it.

**Update: the real root cause was different from what I'd assumed, and
confirmed against actual data again.** `extractTitles` and
`normalizeCrossReferenceNotes` were both targeting literal OSIS tag
names (`<title>`, `<note>`) — but real output never contains those tags
at all. `node-sword-interface` pre-converts them into `<span
class="sword-section-title">` and `<span class="sword-markup
sword-note" type="crossReference" n="A" ...>` before handing content
back. Meanwhile `<w>` and `<reference>` *do* pass through with their
original OSIS tag names unconverted — an inconsistency in SWORD's own
rendering pipeline across element types, not a guessing failure on this
end, but one that required seeing the real bytes to know about.

This also surfaced a structural risk worth fixing properly rather than
patching around: since SWORD reuses `<span>` for everything (Strong's
words, verse-refs, section titles, notes), naive non-greedy tag matching
can't safely find "this element's true closing tag" — a cross-reference
note can end up containing an already-wrapped nested `<span
class="verse-ref">` from an earlier pipeline step, and a naive match
would stop at *that* inner closing tag instead of the outer note's own.
`replaceBalancedSpans` walks forward counting nested `<span>` opens
against `</span>` closes to find the real match, used by both
`extractTitles` and `normalizeCrossReferenceNotes` now.

The cross-reference marker's label also got more reliable: the module
carries an explicit `n="A"` attribute directly (confirmed present),
which is used first, falling back to parsing the trailing letter out of
`osisID` only if `n` is absent.

Verified against your exact real John 3:1 data before shipping — via the
real `referenceParser.js` dependency plus the actual pipeline methods,
not a reimplementation — confirming both markers land on the correct
letters ("a" and "b", matching `n="A"`/`n="B"`), all 7 Strong's-tagged
words in that verse survive intact, and no raw `sword-*` span leaks
through unprocessed.

## The chapter/title bug that turned out to be neither code nor deployment

Worth documenting because it took real diagnostic work to nail down and
the answer was neither "wrong logic" nor "wrong deployment," which is
what several rounds of investigation had been narrowing toward:

Direct in-container testing — importing the actual `swordService.js`
module fresh and calling `extractTitles()` on it directly — proved the
code was 100% correct. `docker compose exec ... grep` proved the
container's *filesystem* had the fresh code. But the running
`node src/index.js` server process kept serving stale output regardless.
The explanation: Node caches imported modules in memory for the
*lifetime of the process* — it doesn't hot-reload when files on disk
change. Rebuilding the image updates the files a *future* process will
load; it does nothing for a process that's already running. `docker
compose build` (even with `--no-cache`) followed by `docker compose up`
without first tearing down the existing container can leave the old
process serving requests against new files it never actually read. The
fix is `docker compose down` *before* rebuilding — that's the step that
actually kills the stale process — not just rebuilding the image
underneath it.

## Footnotes get the same treatment as cross-references

Explanatory/translator notes ("Lit Him", "Or from above") were left
alone when cross-references first got the lettered-marker treatment —
deliberately scoped tight at the time. `normalizeFootnoteMarkup` now
collapses these the same way, runs right after
`normalizeCrossReferenceNotes` in the pipeline (by which point any
`sword-note` span still present is, by definition, not a cross-reference
— those were already consumed — though the `type="crossReference"`
check is kept anyway as a defensive safety net rather than leaning on
that ordering alone).

The visual distinction from cross-reference markers isn't invented
either: explanatory notes carry `n="1"`, `n="2"` (numeric) where
cross-reference notes carry `n="A"`, `n="B"` (alphabetic) — a real
distinction the module itself makes, confirmed from actual output — so
footnotes and cross-references end up visually distinguishable (numbers
vs. letters) for free. Unlike a cross-reference marker, this one doesn't
link anywhere or fetch anything — the note's own text *is* the content,
so it's carried directly in an HTML-escaped `data-note` attribute and
`FootnotePopup` just displays it, no network round-trip needed.

## Cross-references as lettered markers, and chapter/section titles as real headings

Two related fixes to keep the reading flow clean:

**Cross-references no longer sit inline as full citation text.** Each
`<note type="crossReference">` (which can contain more than one
`<reference osisRef="...">`) now collapses into a single small
superscript marker — `normalizeCrossReferenceNotes` in `swordService.js`
— instead of expanding into visible text mid-sentence. The marker's
label isn't invented: it's pulled from the module's own lettering. A
real cross-reference note's `osisID` looks like `"John.3.1.xref.A"`, and
that trailing letter is exactly how printed study Bibles label their own
cross-reference notes in the margin — reusing it keeps the in-app marker
consistent with the source text's own apparatus. Clicking a marker opens
`VersePopup` with every reference from that note listed (extended to
accept a comma-separated `osisRef`, mirroring how `StrongsPopup` already
handled a word mapped to more than one Strong's number), each with its
own "open in tab" button. Falls back to a dagger (†) for any module
whose `osisID`s don't follow the letter convention.

**Chapter numbers and section titles ("CHAPTER 3", "The New Birth") are
now pulled out of the verse text entirely** via `extractTitles`, rather
than running together with the reading text ("CHAPTER 3The New Birth Now
there was a man…", which is what was actually happening before). They
come back as a separate `titles` array on the verse object and render as
a real heading above the text — `groupVerses` in `ReaderPane.jsx` now
also breaks a new segment whenever a verse carries titles (not just on a
book/chapter change), so a heading appears right before the section it
introduces, even mid-chapter, without triggering the "non-contiguous
jump" divider that's meant for something else (a real gap in a verse
selection). Self-closing OSIS milestone tags (`<chapter osisID="John.3"
sID="..."/>`, pure structural metadata with no display content) are
stripped outright rather than left as an inert element.

Note type is checked before collapsing — only `type="crossReference"`
notes get the marker treatment; other note types (translator's notes
like "Lit Him" or "Or from above") are left alone for now. Those could
get the same collapsing treatment later if it'd help; scoped tightly to
what was asked for this round.

## Cross-references — and a real bug this surfaced in my own code

Cross-references (NASB, and any module that has them) come from SWORD as
OSIS `<reference osisRef="John.7.50">John 7:50</reference>` elements
nested inside a `<note type="crossReference">`. Making these clickable
surfaced a genuine bug in code from an earlier round, not another SWORD
surprise this time:

**The bug:** `wrapVerseReferences` (the prose-scanner that finds "cf.
John 3:16"-style mentions in commentary text) was scanning the *entire*
raw HTML string, including inside existing tags' attribute values. An
`osisRef="John.7.50"` attribute is exactly the kind of text that scanner
matches — it has no idea it's looking at markup rather than prose — so
it was injecting a `<span>` tag *in the middle of another tag's
attribute value*, corrupting the surrounding markup badly enough to
produce visibly broken output (attribute fragments showing up as literal
text on screen, which is what got reported). Confirmed directly:
`findReferencesInText('<note osisID="John.3.1.xref.A" ...')` matches
`"John.3.1"` at an offset that lands inside the `osisID="..."` quotes.
Fixed by having `wrapVerseReferences` compute the character spans of
every existing `<...>` tag first and skip any candidate match that falls
inside one.

**The feature:** on top of that fix, `normalizeCrossReferences` converts
the real, structured `<reference osisRef="...">` elements into the exact
same `<span class="verse-ref" data-ref="...">` format the prose-scanner
produces — so both end up clickable through the identical popup /
"open in tab" mechanism already built for commentary references, with
zero frontend changes needed. This turned out to matter for correctness,
not just cleanliness: an abbreviated second reference like "19:39"
sitting right next to a full "John 7:50" has no book name of its own for
the prose scanner to key on (and the parser gets confused by the
adjacent reference-shaped attribute text besides), so it was being
missed by prose-scanning alone. The structured `osisRef` attribute
always has the answer regardless of what the visible label looks like,
which is why cross-references get their own dedicated handler rather
than leaning entirely on the general-purpose one.

Order matters in the pipeline: the prose scan has to run *before* this
conversion (not after), or the `<span data-ref>` it wraps around
reference text would look like a fresh, unwrapped candidate on a second
pass and get double-wrapped; `normalizeCrossReferences` guards against
that by unwrapping-then-rewrapping in one layer if it detects that's
already happened.

**A possible next step, not built yet:** these currently render as
regular inline clickable text right in the verse, which is a reasonable
first pass but does interrupt reading flow mid-sentence the way Study
Bibles' little "a, b, c" footnote letters don't. Collapsing each
`<note type="crossReference">` into a small superscript marker
(clicking it shows all its references in one popup, reusing the
multi-entry pattern already built for words with more than one Strong's
number) would be the natural next iteration if that's wanted.

## Every word linked to Strong's — grounded in real module output

Clicking a word in the reader looks up its Strong's number and shows a
popup with the definition, transcription, and "see also" cross-references
(clickable, so you can chase related words without closing the popup).

This used to carry a real caveat: `enableMarkup()` + `getChapterText`
(the one method the node-sword-interface docs confirm respects markup)
gets Strong's tags into `verse.content`, but the docs never specified
*what the rendered HTML actually looks like* — so the original
`extractStrongsKey()` guessed at several conventions without being able
to verify any of them against a real compiled build.

That's fixed now by moving the ground truth from "guess at SWORD's
renderer" to "target the OSIS specification directly": OSIS marks a
word's Strong's number via a `lemma` (or `savlm`, combined with
morphology) attribute containing `strong:G2316` — e.g.
`<w lemma="strong:G2316">God</w>` — and that holds regardless of which
literal tag name SWORD's filter renders it as. `swordService.
normalizeStrongsMarkup()` matches on the attribute, not the tag name, so
it catches `<w lemma=...>`, `<span lemma=...>`, or anything else
carrying that attribute, and normalizes all of it into one
guaranteed-consistent `<span class="strongs" data-strong="G2316">` —
applied to every passage fetch and every raw dictionary/commentary
entry. It also handles a word mapped to more than one Strong's number
(OSIS allows multiple space-separated `strong:` values in one `lemma` —
real enough that Ezra Bible App's changelog specifically mentions
supporting it); `StrongsPopup` fetches and displays every entry for a
comma-separated `data-strong`, not just the first.

`extractStrongsKey()` in `ReaderPane.jsx` already checked `data-strong`
first, so it didn't need to change — that check just fires reliably now
instead of falling through to the guessier heuristics still kept below
it as a fallback. If a specific module still doesn't show popups: first
confirm that module actually has `hasStrongs: true` (not every
translation is Strong's-tagged at all), and if it does and still nothing
happens, that'd mean this build of `node-sword-interface` renders
something outside the OSIS `lemma`/`savlm` convention — inspect the raw
HTML in devtools and it should be a small regex change in
`normalizeStrongsMarkup`, not a redesign.

## What's scaffolded vs. what needs finishing

This is a working skeleton, not a finished product — treat it as a
strong starting point. Two rounds of real bugs already got fixed here
(worth knowing about since they explain some of the design):

- **`swordService.js` is now verified against the real `node-sword-interface`
  API docs** (API.md on GitHub), not guessed. Two things were wrong in the
  first pass and are fixed now: `ModuleObject`'s identifier field is
  `.name`, not `.code` (this caused the "install" button to send an
  undefined module code and get a 400); and there's no "give me a passage
  by string" method in the library at all — references have to be resolved
  to OSIS keys first. That resolution is handled by the
  `bible-passage-reference-parser` package in `referenceParser.js`, so
  `swordService.getPassage('KJV', 'Romans 8:28-30')` works end-to-end.
- **Prisma migrations are now real, checked-in SQL** (`prisma/migrations/`),
  not just a schema file. The original scaffold pointed `prisma migrate
  deploy` at a schema with no migration history, so it silently applied
  nothing and every DB-backed route 500'd. The included migration was
  generated and validated against a real Postgres instance before being
  committed, so `docker compose up --build` will actually create the
  tables this time.
- **Module install progress** is currently synchronous (the HTTP
  request just blocks until done). Larger modules will want a
  progress stream — SSE or WebSocket — instead.
- **PDF search** uses a basic `ILIKE` query. Fine for a personal
  library; once it grows, swap in Postgres full-text search
  (`tsvector` column + GIN index) — the query surface in
  `pdfService.searchDocuments` is already isolated for that swap.
- **Auth**: none. This is built for a single user on your own network.
  If you ever expose it beyond localhost, put it behind a reverse
  proxy with auth (or add a login layer) before doing so.
- **Commentary modules**: the context builder tries to key commentary
  the same way as Bible text; some commentary module types are keyed
  differently in SWORD and may need a small adapter — flagged with a
  comment in `contextBuilder.js`.

## Project layout

```
backend/
  src/
    routes/         one file per API area (modules, bible, search, pdf, notes, context)
    services/        swordService, pdfService, contextBuilder — the only files touching
                      the SWORD engine / Postgres / Anthropic directly
    db/prisma.js
  prisma/schema.prisma
frontend/
  src/
    components/      ReaderPane, SearchBar, ModuleManager, Library, NotesSidebar, StudyAssistant
    api/client.js     thin fetch wrapper — one function per backend endpoint
```

## Design notes

Dark ink/parchment palette (not the usual cream-and-terracotta AI
default) with a brass accent for primary actions and a verdigris
accent for cross-references/annotations. The signature UI element is
the "marginalia tick" in the reader gutter — a small angled mark
evoking a scribe's cross-reference notation, used to flag verses with
notes or open study threads.
