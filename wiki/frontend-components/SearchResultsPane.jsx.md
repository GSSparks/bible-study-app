# frontend/src/components/SearchResultsPane.jsx

## Purpose

Full-text search pane for the Cell reading environment, covering both Bible text and commentary modules. Supports two tabs — Bible and Commentary — each with its own search state, module picker, and results list. Can be triggered programmatically via `pendingSearch` (from `SearchBar` or `CellView`). Uses `ModulePicker` to select the Bible version or commentary module to search.

## Props

| Prop | Type | Description |
|---|---|---|
| `pendingSearch` | object | `{ query, module, tab, nonce }` — external trigger; nonce changes drive new searches; `tab` is `'bible'` or `'commentary'` |
| `onNavigate` | func | `(ref) => void` — navigate to a result verse or commentary reference |
| `defaultBibleModule` | string | Pre-selects the Bible module when none is chosen yet |

## State / Key Logic

**Bible tab:**
- `query`, `module`, `searchType` — controlled. `module` seeded from `defaultBibleModule` on first load.
- `results`, `total`, `capped`, `discussions` — from `api.search`.
- `highlightedResults` — memo: runs `injectHighlights` on verse HTML, wrapping matches in `<mark>` elements.
- `capped` signals truncation at 500 matches.
- `discussions` — `StudyPost` results from the user's studies, shown in a section below the verse list.

**Commentary tab:**
- `commentaryModule` — `''` means "all commentaries"; a code like `"MHC"` or `"md:my-commentary"` searches one module.
- `commentaryResults`, `commentaryLoading`, `commentaryError`, `commentarySearched` — search lifecycle state.
- `highlightedCommentaryResults` — memo: runs `injectHighlights` on plain-text snippets.
- `doCommentarySearch` calls `api.searchCommentary(q, module)`.

**`pendingSearch` effect:** watches `pendingSearch.nonce`; if `tab === 'commentary'` switches to the Commentary tab and fires `doCommentarySearch`; otherwise fires `doSearch` on the Bible tab.

**`injectHighlights(html, query, searchType)`** — uses `DOMParser` + `walkAndMark` to inject `<mark>` wrappers into verse/snippet HTML. Skips `<sup>` elements (xref/footnote markers). Operates on a detached fragment.

## Dependencies

- `ModulePicker`
- `api.search`, `api.searchCommentary`

## Notes

- `verse-content` CSS class on Bible result spans gives them the same footnote/xref marker styling as the reading pane.
- Commentary results show `reference + moduleTitle` as the header and a 3-line-clamp snippet with highlighted matches.
- The Commentary tab's `ModulePicker` uses `kind="commentary"` and includes a ✕ clear button to reset back to "All commentaries" mode.
