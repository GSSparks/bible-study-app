# frontend/src/components/WorkspaceLayout.jsx

## Purpose

Drag-and-drop tiling window manager used inside `CellView`. Renders an arbitrary grid of typed panes (columns × rows). Each pane shows one of eight content types. Supports desktop drag-to-rearrange, column/row resizing, and a simplified mobile tab-strip layout.

## Props

| Prop | Type | Description |
|---|---|---|
| `layout` | object | Columns/rows structure from `useWorkspaceLayout` |
| `dispatch` | function | Layout reducer dispatch |
| `shared` | object | Bundle of cross-pane state and callbacks (see below) |
| `onAddColumn` | function | Adds a new column to the layout |

**`shared` bundle keys (representative):**
- `focusedReference` — current Bible reference
- `onNavigate` — navigate to a reference
- `auth` — `{ user, isLoggedIn }`
- `defaultBibleModule`
- `strongsDrawer`, `verseDrawer` — drawer state/handlers
- `pendingDictKey`, `pendingDictFilter`, `pendingDictTabId`, `onDictKeyHandled`
- `pendingAiRequest`, `onAiRequestHandled`
- `pendingSearch`
- `commentaryRefreshNonce`, `dictionaryRefreshNonce`

## State / key logic

**Pane types:** `bible`, `commentary`, `dictionary`, `crossrefs`, `passageguide`, `document`, `search`, `links`, `notes` (9 total)

**`PaneShell` sub-component:**
- Renders pane-type-specific content via a `renderContent()` switch statement.
- Shows a type-selector toolbar (icon buttons for each pane type) that dispatches `SET_PANE_TYPE`.
- Handles pane-level drag (HTML5 drag API): `onDragStart` sets transfer data with column+row index; `onDrop` dispatches `SWAP_PANES`.

**Desktop drag-to-rearrange:**
- Each pane has a drag handle in its header.
- `ColDropZone` and `RowDropZone` overlay components appear between panes during an active drag to highlight valid drop targets.
- Drop dispatches `SWAP_PANES` with source and target coordinates.

**Column and row resizing:**
- Vertical dividers between columns: `onMouseDown` starts a resize session tracking `mousemove` to update column widths via `SET_COLUMN_WIDTH`.
- Horizontal dividers between rows within a column: similar mouse tracking for row height via `SET_ROW_HEIGHT`.

**Mobile layout:**
- Single visible pane with a horizontal scrollable `MOBILE_TAB_TYPES` tab strip at the top.
- Tapping a tab type that is not currently visible creates or focuses the appropriate pane.
- `StrongsDrawer` and `VerseDrawer` render as bottom-sheet overlays on mobile.

**`MOBILE_TAB_TYPES`:** Ordered list of pane types shown as tabs on small screens: `bible`, `commentary`, `dictionary`, `passageguide`, `search`, `notes`. Less-common types (`crossrefs`, `links`, `document`) are omitted from the mobile strip.

## Dependencies

- `useWorkspaceLayout` (`../hooks/useWorkspaceLayout.js`) — layout state and reducer (consumed by the parent `CellView`; layout + dispatch passed as props here).
- `useHorizontalScroll` (`../hooks/useHorizontalScroll.js`) — attached to the Bible pane's per-tab tab strip inside `PaneShell` to allow mouse-wheel horizontal scrolling when many tabs are open.
- `ReaderPane` — Bible pane content.
- `CommentaryPane` — Commentary pane content (highlights, note indicators, phrase selection, hover-card verse lookup).
- `DictionaryPane` — Dictionary pane content.
- `StudyAssistant` / `AIChatPane` — Passage Guide / AI chat pane content.
- `CrossRefsPane` — Cross-references pane.
- `DocumentPane` — PDF reader pane.
- `SearchPane` — Full-text search pane.
- `LinksPane` — External links pane.
- `CellNotePane` — Freestanding Markdown note editor pane (type `notes`).
- `StrongsDrawer`, `VerseDrawer` — overlay drawers.

## Notes

- The layout data structure is a flat array of column objects, each containing an array of row objects with `{ type, tabState }`.
- Pane visibility on desktop is always rendered — CSS hides nothing; all panes in the grid are mounted simultaneously.
- The mobile tab strip only shows a curated subset of pane types; less-common types (crossrefs, links) may not appear.
- Column widths and row heights are stored as flex percentages so the grid is responsive to window resizing.
