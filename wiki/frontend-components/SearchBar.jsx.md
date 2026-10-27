# frontend/src/components/SearchBar.jsx

## Purpose

A Google-style inline quick-search bar shown in the Cell window header. Shows a live dropdown as the user types: reference lookups get a direct "Go to…" item; keyword queries show up to 5 matching verse previews fetched in real time, plus footer actions to open full search in the Bible or Commentary tabs. Exposed via `forwardRef` so the parent can focus it on `/` keypress.

## Props

| Prop | Type | Description |
|---|---|---|
| `activeModule` | string | Currently active Bible module — used for live verse preview searches |
| `onJump` | func | `(ref) => void` — navigate directly to a Bible reference |
| `onSearch` | func | `(query) => void` — open the Search pane with a Bible search |
| `onCommentarySearch` | func | `(query) => void` — open the Search pane on the Commentary tab |

## State / Key Logic

- `query` — controlled input value.
- `open` — whether the dropdown is visible.
- `verseHits` — up to 5 verse results from the debounced live preview search.
- `searching` — true while the debounced API call is in flight.
- `activeIdx` — keyboard-navigation cursor into `navItems`.
- `looksLikeReference(q)` — regex: `(\d\s+)?[a-z][a-z.]+\.?\s+\d` — matches `"John 3"`, `"1 Cor 13:1"`, `"Gen.1"`, etc.
- **Live preview:** when the query is non-empty and not a reference, a 350ms debounced call to `api.search(trimmed, activeModule, 'multiWord')` fetches verse previews. Skipped when `activeModule` is absent.
- **`navItems` array:** unified list for keyboard navigation — `ref` item (if reference detected), then `verse` items (up to 5), then always `search-bible` and `search-commentary` footer items.
- **`selectItem(item)`** dispatches to `onJump`, `onSearch`, or `onCommentarySearch` and clears the input.
- **Keyboard:** ArrowDown/ArrowUp move `activeIdx`; Enter selects the active item or falls back to reference-jump / bible-search; Escape closes the dropdown.
- **`onMouseDown` (not `onClick`)** on dropdown buttons prevents the input from blurring before the selection fires.

## Dependencies

- `api.search` — for live verse preview
- `lucide-react` — `Search`, `X`, `ArrowRight`, `BookOpen` icons

## Notes

- Reference detection is intentionally simple — false positives navigate to a "not found" state rather than throwing errors.
- The footer "Search in Bible →" and "Search in Commentaries →" items are always shown when the dropdown is open with a non-empty query, regardless of whether verse hits were found.
- `forwardRef` pattern lets the parent focus the bar without holding a DOM ref itself.
