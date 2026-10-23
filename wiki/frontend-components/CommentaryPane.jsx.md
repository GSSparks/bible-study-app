# frontend/src/components/CommentaryPane.jsx

## Purpose

Commentary reading pane used in the right column of `MainLayout`. Dedicated to commentary modules — intentionally stripped of all Bible-text-specific UI (verse selection, highlights, phrase study, interlinear mode, group findings). Fetches passage content and renders it verse-by-verse as flowing prose, with footnote popups, cross-reference hover cards, Strong's number clicks, and `SelectableNoteRegion` for taking notes on commentary text.

## Props

| Prop | Type | Description |
|---|---|---|
| `module` | string | Commentary module code (e.g. `MHC`, `md:MyCommentary`) |
| `reference` | string | Current Bible reference — follows `focusedReference` from `MainLayout` |
| `bibleModule` | string \| undefined | Bible module used to fetch verse text in the cross-ref hover card preview |
| `onVerseRefClick` | func | `(osisRef, event) => void` — navigate to a Bible reference |
| `onStrongsClick` | func | `(key, event, morph, word, module) => void` |
| `onNavigate` | func | `(ref) => void` — called when the hover card "open" action is triggered |
| `refreshNonce` | any | Changing this value re-triggers the passage fetch |

## State / Key Logic

- **Passage loading**: `api.getPassage(module, reference)` on every `[module, reference, refreshNonce]` change. After verses load, fetches annotations (`api.listHighlights` + `api.listNotes`) for the chapter prefix and builds `highlightMap` / `noteMap`. Non-fatal.
- **Content click routing**: Delegates `.footnote-marker` → `FootnotePopup`, `.xref-marker` / `.verse-ref` → `onVerseRefClick`, Strong's detection → `onStrongsClick` via `extractStrongsData` (same 4-ancestor walk as `ReaderPane`).
- **Hover card**: `.xref-marker` and `.verse-ref` mouse-over triggers `VerseHoverCard` with 150 ms debounced close. Fetches from `bibleModule` (not `module`) so the preview always shows Bible text, not commentary.
- **Text selection toolbar**: `handleContentMouseUp` intercepts text drags, detects which verse entries are spanned via `verseRefs` + `range.intersectsNode`, and sets `phraseSelection`. A portal toolbar offers highlight colour swatches, remove-highlight, and Note. No phrase-study buttons — those are only meaningful for scripture.
- **Highlights**: Verse-level, same Map structure and API calls as `ReaderPane`. Applied as a background tint on the verse `<div>`.
- **Note indicators**: A small brass dot is rendered before the verse text when `noteMap.has(verseRef)`. Updated optimistically after `VerseCommentaryEditor` saves.

## Dependencies

- `SelectableNoteRegion` — wraps content (with `showNoteButton={false}`; toolbar provides its own Note button)
- `FootnotePopup` — positioned card for SWORD footnote text
- `VerseHoverCard` — hover preview for cross-references (uses `bibleModule`)
- `VerseCommentaryEditor` — floating note editor anchored to a verse reference
- `api.getPassage`, `api.listHighlights`, `api.listNotes`, `api.createHighlight`, `api.deleteHighlight`

## Notes

- Commentary modules (SWORD) return verse objects via `api.getPassage`, identical in shape to Bible verse objects. `v.content` is already HTML.
- Unlike `ReaderPane`, there is no marginalia column, no interlinear mode, no phrase-study toolbar, and no group highlights/findings — these are Bible-text concepts.
- `bibleModule` is passed from `MainLayout`'s `defaultBibleModule` prop, since the commentary module itself cannot render Bible verse previews.
- Highlights are keyed to the Bible verse reference (e.g. `John 3:16`), so they are shared with the same verse in `ReaderPane`.
