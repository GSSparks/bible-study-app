# frontend/src/components/LinksPane.jsx

## Purpose

A compact "resource links" pane for the Cell reading environment that shows three collapsible sections for the focused verse: **Lexicon** (Strong's tagged words with transcription and gloss), **Commentaries** (all installed commentary modules collapsed by default, probed eagerly), and **Notes** (user notes on the chapter). Acts as a quick-access companion to the full dictionary/commentary tabs.

## Props

| Prop | Type | Description |
|---|---|---|
| `focusedReference` | string | The currently focused verse reference |
| `defaultBibleModule` | string | Module to fetch Strong's-tagged verse text from |
| `onStrongsClick` | func | `(key, event, morph, word, module) => void` |
| `onVerseRefClick` | func | `(ref, event) => void` — called on commentary cross-reference clicks |
| `isLoggedIn` | bool | Notes section is hidden for anonymous users |

## State / Key Logic

- **Lexicon**: On `[focusedReference, defaultBibleModule]` change, fetches `api.getPassage` and extracts all `[data-strong]` elements via a detached DOM div. Fetches each unique Strong's key's entry via `api.getStrongsEntry`, caching results in `strongsCache` (survives reference changes).
- **Commentaries**: Fetches `api.listInstalledModules('COMMENTARY')` once on mount. On each `focusedReference` change, probes every module via `api.getPassage` and stores results in a `Map` keyed by module code. `loadedForRef` ref prevents duplicate fetches for the same reference+module pair. `visibleCommentaries` filters to modules that have data (or are still loading). Each commentary is expandable inline.
- **Notes**: `api.listNotes({ reference: toChapterRef(focusedReference) })` — uses chapter-level reference to capture all verse notes in the chapter.
- `sections` — `{ lexicon, commentaries, notes }` open/closed state. `Section` is an internal collapsible component with chevron icon and optional badge.
- Commentary click handler: suppresses default link behavior, routes `.xref-marker` and `.verse-ref` clicks to `onVerseRefClick`.

## Dependencies

- `api.getPassage`, `api.getStrongsEntry`, `api.listInstalledModules`, `api.listNotes`

## Notes

- All three sections can be open simultaneously; each is independently toggled.
- Commentary data is probed eagerly on reference change (not on first expand) so empty modules are hidden before the user tries to open them.
- `toChapterRef` strips the verse number (e.g. `Gen 1:5` → `Gen 1`) so notes from the whole chapter appear together.
