# frontend/src/components/SearchResultsPane.jsx

## Purpose

Full-Bible text search pane for the Cell reading environment. Supports two search modes: "All words" (multi-word, any order) and "Exact phrase". Results are displayed as verse-reference + highlighted verse text cards. Can be triggered programmatically via `pendingSearch` (from the `SearchBar`'s parsed query). Uses `ModulePicker` to select the Bible version to search.

## Props

| Prop | Type | Description |
|---|---|---|
| `pendingSearch` | object | `{ query, module, nonce }` — external trigger; nonce changes drive new searches |
| `onNavigate` | func | `(ref) => void` — navigate to a result verse |
| `defaultBibleModule` | string | Pre-selects the module when none is chosen yet |

## State / Key Logic

- `query`, `module`, `searchType` — controlled. `module` is seeded from `defaultBibleModule` on first load.
- `pendingSearch` is watched by nonce — on change, sets `query`, optionally sets `module`, and calls `doSearch`.
- `doSearch` calls `api.search(query, module, searchType)`. Sets `results`, `total`, `capped`.
- `highlightedResults` — computed via `useMemo` from `results`. `injectHighlights` uses a DOMParser to walk the verse HTML and wrap matches in `<mark>` elements, skipping `<sup>` (xref/footnote markers) to avoid false matches.
- `walkAndMark` operates on a detached fragment (not live DOM) and uses `Node.TEXT_NODE` detection to inject marks at the right level.
- `capped` signals the result was truncated to 500 matches; a note is shown at the bottom.
- `countLabel` formats the result count with pluralisation.

## Dependencies

- `ModulePicker`
- `api.search`

## Notes

- `injectHighlights` uses `DOMParser` + `walkAndMark` rather than a simple `replace` to correctly skip Strong's tags, footnote markers, and other HTML in verse content without corrupting the markup.
- `verse-content` CSS class on the result span gives the verse the same footnote/xref marker styling as the reading pane.
