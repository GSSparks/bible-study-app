# frontend/src/components/SelectableNoteRegion.jsx

## Purpose

A wrapper div that listens for text selection events and optionally shows a "+ note" floating button when text is selected inside it. Clicking the button opens `SelectionNotePopup`. Used as the outer content wrapper in `ReaderPane` and other text-display components. Designed as a low-coupling wrapper: it adds note-creation capability without requiring the parent to duplicate selection-detection logic.

## Props

| Prop | Type | Description |
|---|---|---|
| `reference` | string | Passed to `SelectionNotePopup` as the note anchor |
| `module` | string | Passed to `SelectionNotePopup` |
| `showNoteButton` | bool | If false, suppresses the "+ note" button (used by ReaderPane which handles its own selection toolbar) |
| `className` | string | Class applied to the wrapper div |
| `onClick` | func | Passed through to the wrapper div |
| `onContextMenu` | func | Passed through |
| `onMouseUp` | func | Called after this component's own mouseUp handler |
| `onMouseOver` | func | Passed through |
| `onMouseLeave` | func | Passed through |
| `children` | node | Content to render inside |

## State / Key Logic

- `selection` — `{ text, x, y }` — set when `window.getSelection()` has non-empty text inside the container. Cleared when selection is empty.
- `showPopup` — toggled to `true` when the "+ note" button is clicked. Opening the popup does NOT collapse the selection (button uses `onMouseDown` with `preventDefault()`).
- `handleMouseUp` runs first, then calls `onMouseUp?.(e)` — so a parent like `ReaderPane` can piggyback additional selection-handling on the same event without replacing this component's behavior.

## Dependencies

- `SelectionNotePopup`
- `createPortal` (for the "+ note" button)

## Notes

- When `showNoteButton` is false (as in `ReaderPane`), the component still tracks selection state and calls `onMouseUp` — it just does not render the button. `ReaderPane` uses this to get its phrase-selection toolbar triggered from the same `mouseup` event.
- The `contentRef` check (`contentRef.current?.contains(sel.anchorNode)`) prevents the selection being reported when the user drags from outside the container into it.
