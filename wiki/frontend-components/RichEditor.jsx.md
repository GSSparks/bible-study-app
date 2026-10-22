# frontend/src/components/RichEditor.jsx

## Purpose

A thin wrapper around `@uiw/react-md-editor` providing a consistent Markdown editor with configurable height and color mode. Used throughout the app wherever a full Markdown editor is needed (study lesson editing, post composition forms, etc.).

## Props

| Prop | Type | Description |
|---|---|---|
| `value` | string | Markdown content |
| `onChange` | func | `(value) => void` — called with the new string (coerces undefined to `''`) |
| `height` | number | Editor height in pixels; default 260 |
| `colorMode` | string | `'dark'` or `'light'`; default `'dark'` |

## State / Key Logic

- No internal state. Purely presentational.
- `preview="edit"` — shows only the source editor, not a side-by-side preview, to maximize space in embedded contexts.

## Dependencies

- `MDEditor` from `@uiw/react-md-editor`

## Notes

- The `data-color-mode` wrapper is required by MDEditor's CSS variable system.
- `NotePanel` and `NotesSidebar` import MDEditor directly (for configuration differences); `RichEditor` is for cases where the defaults are sufficient.
