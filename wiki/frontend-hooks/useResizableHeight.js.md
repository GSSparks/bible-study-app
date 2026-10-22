# frontend/src/hooks/useResizableHeight.js

**Purpose**

Provides a draggable height value for panels with a vertical resize handle, with persistence across page reloads via `localStorage`. It is the vertical counterpart to `useResizableWidth`. The `side` parameter determines whether dragging down grows or shrinks the panel (useful for panels anchored to the bottom vs. the top of their container).

**Key exports / contents**

- `useResizableHeight({ key, defaultHeight, min, max, side })` — hook returning `{ height, onDragStart }`.
  - `key` — `localStorage` key for persistence.
  - `defaultHeight` — initial height in pixels if no saved value exists.
  - `min` — minimum height in pixels (default `160`).
  - `max` — maximum height in pixels (default `800`).
  - `side` — `'top'` (panel below the handle; dragging down shrinks it) or `'bottom'` (panel above the handle; dragging down grows it). Default `'top'`.
  - `height` — current height in pixels as a number.
  - `onDragStart` — mouse-down handler to attach to the drag handle element.

**Dependencies / relationships**

- Uses `useCallback`, `useEffect`, `useRef`, `useState` from React.
- Reads/writes to `localStorage`; failures (e.g., private browsing mode) are silently swallowed.
- Consumed by panels that need a draggable height, such as the StudyAssistant panel or note editor below a reading pane.
- Mirrors `useResizableWidth.js` — same pattern, different axis.

**Notes**

- Drag state is tracked in a `ref` (not state) to avoid triggering re-renders during the drag.
- `mousemove` and `mouseup` listeners are attached to `window` so the drag continues even if the cursor leaves the handle area.
- `document.body.style.cursor` and `userSelect` are modified during a drag to provide visual feedback and prevent text selection; both are restored on `mouseup`.
- `localStorage` errors are silently caught; the hook degrades gracefully to in-memory state only.
