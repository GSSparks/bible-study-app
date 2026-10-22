# frontend/src/hooks/useHorizontalScroll.js

**Purpose**

Provides a ref that, when attached to a horizontally-scrollable container, redirects vertical mouse-wheel input into horizontal scrolling. This is necessary because React's synthetic `onWheel` event is passive by default and cannot call `preventDefault()` — without this hook, a user scrolling vertically over a horizontal track would scroll the page instead of the track.

**Key exports / contents**

- `useHorizontalScroll()` — hook that returns a `ref` to attach to any DOM element.
  - Attaches a non-passive `wheel` listener on mount.
  - Only redirects scroll if the element actually overflows horizontally (`scrollWidth > clientWidth`); otherwise vertical scroll passes through normally.
  - Adds `e.deltaY` to `el.scrollLeft` to convert vertical wheel motion to horizontal movement.
  - Cleans up the listener on unmount.

**Dependencies / relationships**

- Uses `useEffect` and `useRef` from React.
- Consumed by any component that renders a horizontally-scrollable tab bar or track (e.g., tab strip in `WorkspaceLayout.jsx` or module-picker rows).

**Notes**

- The non-passive listener (`{ passive: false }`) is required to allow `preventDefault()`. Browsers suppress passive-listener `preventDefault()` calls silently, which is why React's synthetic handler is insufficient here.
- The check `el.scrollWidth <= el.clientWidth` ensures the hook is a no-op when there is nothing to scroll horizontally.
