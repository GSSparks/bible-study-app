# frontend/src/hooks/useTabbedWindow.js

**Purpose**

Manages tab state for a single reading region — the list of open tabs, which tab is active, and operations to add, close, or swap modules within tabs. Each Bible, Commentary, and Dictionary pane in the classic `MainLayout` gets its own instance of this hook. It is a simpler predecessor to `useWorkspaceLayout`, used in contexts where the tab set is a flat list rather than a grid of panes.

**Key exports / contents**

- `uid()` — module-level incrementing ID generator (`tab-1`, `tab-2`, …). Exported so callers can generate IDs in the same sequence if needed.
- `useTabbedWindow(initial?, initialActiveId?)` — hook returning:
  - `tabs` — array of `{ id, module, title, moduleType? }` objects.
  - `activeTabId` — ID of the currently active tab (or `null`).
  - `activeTab` — the active tab object derived from `tabs` and `activeTabId`.
  - `setActiveTabId(id)` — directly set the active tab.
  - `addTab(module, title, moduleType?)` — appends a new tab and activates it; returns the new tab's ID. Duplicate modules are allowed.
  - `closeTab(id)` — removes a tab; if it was active, activates the first remaining tab.
  - `swapTabModule(id, module, title, moduleType?)` — replaces the module/title on an existing tab without changing its ID.

**Dependencies / relationships**

- Uses `useState` from React.
- Consumed by `MainLayout.jsx` (one instance per pane type: Bible, Commentary, Dictionary) and potentially other flat-tab contexts.
- `useWorkspaceLayout.js` provides the more advanced workspace-level equivalent used by `CellView` / `WorkspaceLayout`.

**Notes**

- The module-level `nextTabId` counter is not reset between component mounts; IDs are globally unique within a page load, which avoids key collisions when multiple `useTabbedWindow` instances coexist.
- Duplicate tabs of the same module are intentionally permitted (the comment in the file explains this was a deliberate design change).
- `moduleType` is only included in the tab object when it is truthy, keeping the shape clean for tabs that don't need it.
