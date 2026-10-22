# frontend/src/hooks/useResizableWidth.js

**Purpose**

Provides a draggable width value for panels with a vertical (column) resize handle, with persistence across page reloads via `localStorage`. Used by slide-in panels like `BiblePanel` and `BookPanel` so users can set their preferred widths and have them remembered between sessions. The `side` parameter controls the drag direction convention.

**Key exports / contents**

- `useResizableWidth({ key, defaultWidth, min, max, side })` — hook returning `{ width, onDragStart }`.
  - `key` — `localStorage` key for persistence.
  - `defaultWidth` — initial width in pixels if no saved value exists.
  - `min` — minimum width in pixels (default `260`).
  - `max` — maximum width in pixels (default `720`).
  - `side` — `'left'` (panel on the right side of screen; dragging left grows it) or `'right'` (panel on the left side; dragging right grows it). Default `'left'`.
  - `width` — current width in pixels as a number.
  - `onDragStart` — mouse-down handler to attach to the drag handle element.

**Dependencies / relationships**

- Uses `useCallback`, `useEffect`, `useRef`, `useState` from React.
- Reads/writes to `localStorage`; failures are silently swallowed.
- Consumed by `BiblePanel.jsx` and `BookPanel.jsx` (slide-in panels).
- Mirrors `useResizableHeight.js` — same pattern, horizontal axis.

**Notes**

- Drag state is stored in a `ref` to avoid spurious re-renders during dragging.
- `window` mousemove/mouseup listeners allow dragging past the handle without losing the drag.
- Body cursor and user-select are set to `col-resize` / `none` during the drag for correct visual feedback, and restored on mouseup.
- `localStorage` failures (private browsing, storage quota) are caught and ignored.
