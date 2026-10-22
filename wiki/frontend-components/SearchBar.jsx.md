# frontend/src/components/SearchBar.jsx

## Purpose

A unified reference/search input bar shown in the Cell window header. Dispatches to either `onJump` (navigate to a Bible reference) or `onSearch` (open the search results pane) based on whether the input looks like a reference. Uses a simple heuristic: a string matching `BookName chapter[:verse]` format is treated as a reference; anything else is treated as a search query.

## Props

| Prop | Type | Description |
|---|---|---|
| `activeModule` | string | Currently active module (available for context; not currently used in render) |
| `onJump` | func | `(ref) => void` — navigate to the parsed reference |
| `onSearch` | func | `(query) => void` — open search results for the query |

## State / Key Logic

- `query` — controlled input.
- `looksLikeReference(q)` — regex test: `(\d\s+)?[a-z][a-z.]+\.?\s+\d` — book name + space + number.
- On form submit, routes to `onJump` or `onSearch`.
- Exposed via `forwardRef` so parent (Cell header) can `.focus()` the input on `/` keypress.

## Dependencies

None beyond React.

## Notes

- The routing heuristic is intentionally simple and handles edge cases like `1 Cor 13:1` (leading digit), `Gen.1.1` (period-separated), and `Romans 8`. False positives (search queries that happen to look like references) are acceptable — navigating to a wrong reference will show "no text found" rather than producing an error.
- `forwardRef` pattern lets the parent focus the bar without holding a DOM ref itself.
