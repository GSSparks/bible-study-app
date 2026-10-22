# frontend/src/components/ContextZoomMenu.jsx

## Purpose

A small two-item context menu for changing the zoom level / scope of the Cell Bible pane: "Zoom out to this section" and "Show whole chapter". Triggered either from a header button or by right-clicking verse text. Both invocation paths use the same component so zoom logic lives in one place (in `ReaderPane`).

## Props

| Prop | Type | Description |
|---|---|---|
| `x` | number | Horizontal position (clamped to avoid right-edge overflow) |
| `y` | number | Vertical position |
| `onSelectSection` | func | Navigate to the section reference |
| `onSelectChapter` | func | Navigate to the full chapter |
| `onClose` | func | Dismiss the menu |

## State / Key Logic

- No internal state. Purely presentational.
- Position clamped: `left = min(x, window.innerWidth - 230)`.
- Full-screen `z-40` backdrop captures left clicks and right-clicks (via `onContextMenu` + `preventDefault`) to close without propagating a second context menu event.

## Dependencies

- `createPortal`

## Notes

- The right-click-to-dismiss on the backdrop (`onContextMenu` + `e.preventDefault()`) prevents the browser's native context menu from appearing when the user right-clicks outside the menu to close it. This matches the pattern used in `BookChapterPicker`.
