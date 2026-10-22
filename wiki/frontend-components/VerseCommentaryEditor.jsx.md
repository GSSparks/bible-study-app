# frontend/src/components/VerseCommentaryEditor.jsx

## Purpose

A floating Markdown note editor anchored to a verse reference. Opened by ReaderPane when the user clicks "Note" in the verse-selection or phrase-selection toolbar. Loads any existing commentary entry for the reference on open, pre-populates the body with a blockquote of the selected text if provided, supports write/preview tab toggle, and saves (or updates) the note via `api.saveCommentaryNote`. Saves appear in the "Commentary → My Studies" pane.

## Props

| Prop | Type | Description |
|---|---|---|
| `reference` | string | Bible reference the note is anchored to |
| `x` | number | Horizontal viewport position for the popup |
| `y` | number | Vertical viewport position for the popup |
| `onClose` | func | Dismiss the editor |
| `onSaved` | func | Called after a successful save |
| `initialQuote` | string | Pre-fills the body with `> "quote"` |

## State / Key Logic

- On mount, `api.getCommentaryEntry(reference)` is called. If an entry exists, its `id`, `title`, and `bodyMd` are loaded for editing. If no entry exists and `initialQuote` is provided, the body is seeded with the blockquote.
- `tab` — `'write'` or `'preview'`. Preview uses `ReactMarkdown` with `remark-gfm`.
- Position is clamped: `left = min(x, window.innerWidth - 520)`, `top = min(y, window.innerHeight - 420)`.
- Ctrl/Cmd+Enter triggers save.
- Save button label is `'update'` if an existing entry was loaded, `'save'` otherwise.
- Uses `createPortal` to render above all other content.

## Dependencies

- `api.getCommentaryEntry`, `api.saveCommentaryNote`
- `ReactMarkdown`, `remark-gfm`
- `createPortal`

## Notes

- The editor uses a plain `<textarea>` (monospace, Markdown-source editing) rather than the `MDEditor` component used elsewhere, because the float/portal context makes the heavier WYSIWYG editor harder to integrate here.
- Notes saved here appear under the "My Studies" commentary module rather than as regular notes, reflecting the commentary-first mental model.
