# frontend/src/components/SelectionNotePopup.jsx

## Purpose

A small floating note editor that appears after a text selection. Displays the selected quote as a blockquote (or the reference if no quote), then offers a plain textarea to write a note body. On save, creates a note with `quote`, `reference`, `module`, and `tags: ['selection']`. Used exclusively by `SelectableNoteRegion`.

## Props

| Prop | Type | Description |
|---|---|---|
| `quote` | string | The selected text to attach the note to |
| `reference` | string | Bible reference context (optional) |
| `module` | string | Module context (optional) |
| `x` | number | Horizontal position |
| `y` | number | Vertical position |
| `onClose` | func | Dismiss and discard |

## State / Key Logic

- `body` — controlled textarea. Save is disabled until `body.trim()` is non-empty.
- Position clamped: `left = min(x, window.innerWidth - 340)`, `top = min(y, window.innerHeight - 280)`.
- Full-screen backdrop div catches outside clicks and calls `onClose` (discards the draft).
- Uses `createPortal`.

## Dependencies

- `api.createNote`
- `createPortal`

## Notes

- Plain textarea (no Markdown editor) is intentional — this is a quick annotation, not a full note session.
- The `quote` is stored in the `Note.quote` field, which is used for text-matching re-application of highlights in `BookPane`.
