# frontend/src/hooks/useWorkspaceLayout.js

**Purpose**

Manages the full state of the Cell workspace window manager: a two-dimensional grid of columns × rows of typed panes, each of which may contain multiple tabs with per-tab module, reference, and parallel-Bible state. Layout changes are automatically persisted to `localStorage` under the key `workspace-layout-v1`. On load, saved state is hydrated with fresh IDs (so no ID collisions) and a one-time migration converts the old `aichat` pane type to `passageguide`.

**Key exports / contents**

- `PANE_TYPES` — array of `{ value, label, moduleType }` objects defining all valid pane types:
  `bible`, `commentary`, `dictionary`, `crossrefs`, `passageguide`, `links`, `document`, `search`, `notes`.
- `useWorkspaceLayout()` — hook returning `{ columns, ...actions }`:
  - `columns` — array of column objects, each containing `{ id, flex, rows }` where each row is a pane `{ id, type, tabs, activeTabId, flex, reference }`.
  - `addColumn(type?)` — appends a new column to the right.
  - `removePane(colId, rowId)` — removes a pane; removes the column if it was the last pane; never leaves zero columns.
  - `splitPane(colId, rowId, type?)` — inserts a new pane below the target pane; returns the new pane's ID.
  - `setPaneType(colId, rowId, type)` — changes a pane's type; preserves existing tabs for tab-supporting types.
  - `resizeColumn(colId, nextColId, pixelDelta, containerWidth)` — adjusts flex values for two adjacent columns using a drag delta; enforces a minimum flex of `0.15`.
  - `resizeRow(colId, rowId, nextRowId, pixelDelta, containerHeight)` — adjusts flex values for two adjacent rows within a column; enforces a minimum flex of `0.1`.
  - `addTab(colId, rowId, module, title, initialReference?)` — adds a tab to a pane and activates it; returns the new tab ID.
  - `removeTab(colId, rowId, tabId)` — removes a tab; activates the first remaining tab.
  - `setActiveTab(colId, rowId, tabId)` — activates a tab without changing the tab list.
  - `swapTabModule(colId, rowId, tabId, module, title)` — replaces the module/title on an existing tab.
  - `setBibleTabReference(colId, rowId, tabId, ref)` — stores a per-tab focused reference (used by Bible pane tabs to track their own navigation independently of the global focused reference).
  - `addTabParallel(colId, rowId, tabId, module, title)` — adds a parallel-Bible entry to a tab.
  - `removeTabParallel(colId, rowId, tabId, parallelId)` — removes a parallel-Bible entry.
  - `swapTabParallel(colId, rowId, tabId, parallelId, module, title)` — replaces a parallel-Bible entry's module/title.
  - `movePane(fromColId, fromRowId, toColId, toRowId, position)` — drag-and-drop pane reordering. `position` is one of `'before'`, `'after'`, `'new-col-before'`, `'new-col-after'`.

**Dependencies / relationships**

- Uses `useState` from React.
- Reads/writes `localStorage` key `workspace-layout-v1`; errors are silently swallowed.
- Consumed by `WorkspaceLayout.jsx` (the visual workspace renderer) and `CellView.jsx` (which owns the hook instance and passes actions down).
- `useTabbedWindow.js` is the simpler flat-tab analog used in `MainLayout`.

**Notes**

- The `update(fn)` helper ensures every mutation also calls `saveToStorage`, keeping localStorage in sync without additional `useEffect`.
- Persistence uses a "slim" format that strips live IDs (re-generated on load) and converts `activeTabId` to `activeTabIndex` (index-based, since IDs change). This avoids stale ID references in storage.
- The `aichat` → `passageguide` migration in `loadFromStorage` handles the rename of the AI chat pane type from an earlier version.
- `defaultLayout()` creates two columns: a Bible pane (flex 1) and a Commentary pane (flex 0.65).
