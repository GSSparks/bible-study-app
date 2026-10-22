# frontend/src/components/BookPanel.jsx

## Purpose

A slide-in right-side panel (always mounted, CSS-toggled) for quick prose book access from any view without navigating away. Contains a book selector dropdown in the header and a full `BookPane` reader in the body. Shares `bookReader` state with `BooksView` so position is preserved when switching between the panel and the full view. Toggled via Ctrl+K from `AppShell`.

## Props

| Prop | Type | Description |
|---|---|---|
| `open` | bool | Controls slide-in/out |
| `onClose` | func | Close the panel |
| `bookReader` | object | `{ module, scrollY }` — shared reader state from `AppShell` |
| `onBookChange` | func | `({ module, scrollY }) => void` — called when the selected book or scroll position changes |
| `onOpenInBooks` | func | `(moduleName) => void` — navigate to `BooksView` for the current book |
| `isLoggedIn` | bool | Passed through to `BookPane` for note/highlight features |
| `defaultBibleModule` | string | Passed through to `BookPane` for inline Bible reference links |
| `onOpenInBible` | func | Passed through to `BookPane` |
| `onOpenInCell` | func | Passed through to `BookPane` |

## State / Key Logic

- `books` — fetched from `api.listInstalledBooks()` on mount; used to populate the selector dropdown and resolve a module name to a display title.
- `listOpen` — controls the book selector dropdown inline (not a portal; positioned absolutely within the header).
- `selectedModule` — derived from `bookReader.module`; null when no book has been chosen.
- `selectedBook` — the matching entry in `books` for `selectedModule`; used for the display title in the header button.
- `selectBook(book)` calls `onBookChange({ module: book.name, scrollY: 0 })` and closes the dropdown.
- The panel is always mounted (`translate-x-full` when closed) to preserve `BookPane` scroll position across panel open/close cycles.
- A semi-transparent backdrop is rendered behind the panel when open; clicking it calls `onClose`.
- The `ArrowUpRight` button (shown only when a book is selected) calls `onOpenInBooks(selectedModule)` and then `onClose()` to switch to the full `BooksView`.

## Dependencies

- `BookPane`
- `api.listInstalledBooks`
- `lucide-react` (`ArrowUpRight`, `X`)

## Notes

- `bookReader` state is owned by `AppShell` and passed down to both `BookPanel` and `BooksView`, so switching from the panel to the full view (or vice versa) keeps the reader at the same book and scroll position.
- The panel width is `w-full` on small screens and `sm:w-[600px]` on larger screens.
