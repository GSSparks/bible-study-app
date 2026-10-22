# frontend/src/components/BookChapterPicker.jsx

## Purpose

A two-step Bible navigation overlay: step 1 shows all books in two columns (OT then NT), step 2 shows a chapter-number grid for the selected book. Used by `RefNav` (triggered from the book-name button) and any other component that needs full book-browse navigation. Fullscreen on mobile, a fixed-position dropdown on desktop.

## Props

| Prop | Type | Description |
|---|---|---|
| `x` | number | Horizontal anchor position (desktop only; ignored on mobile) |
| `y` | number | Vertical anchor position (desktop only; ignored on mobile) |
| `onSelectChapter` | func | `(ref) => void` — called with a ref like `"Gen 3"` when a chapter is clicked |
| `onClose` | func | Close the picker |

## State / Key Logic

- `selectedBook` — the book chosen in step 1. `null` = step 1 (book list); set = step 2 (chapter grid).
- `isMobile` — `window.innerWidth < 640` at render time; if true, `positionStyle` is `{}` and the component uses `inset-0` for full-screen display.
- On desktop, left is clamped to `min(x, window.innerWidth - 340)` and top to `min(y, window.innerHeight - 420)`.
- Books are split from `BIBLE_BOOKS` into `otBooks`/`ntBooks` by `testament` field.
- Step 2 generates chapters from `selectedBook.chapters` (integer chapter count in the book data).
- Right-click on the backdrop also closes (via `onContextMenu`).

## Dependencies

- `BIBLE_BOOKS` from `utils/bibleBooks.js`
- `createPortal`

## Notes

- The back button in step 2 resets `selectedBook` to `null` without closing — pure client-side state.
- Choosing a chapter calls `onSelectChapter` AND `onClose` — the picker is always dismissed after selection.
