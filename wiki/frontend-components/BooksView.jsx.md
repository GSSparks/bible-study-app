# frontend/src/components/BooksView.jsx

## Purpose

Full-page Books navigation view (always-mounted in `AppShell`). Provides a sidebar listing all installed book modules and a main reading pane (`BookPane`) for the selected book. State for the open book is lifted to `AppShell` so it is shared with `BookPanel`.

## Props

| Prop | Type | Description |
|---|---|---|
| `isActive` | boolean | Controls CSS visibility (always-mounted pattern) |
| `bookReader` | object | `{ module, scrollY }` — lifted state from AppShell; shared with BookPanel |
| `onBookChange` | function | Called with `{ module, scrollY }` when user opens a book or scrolls |
| `auth` | object | `{ user, isLoggedIn }` |

## State / key logic

- **Book list** — fetched once via `api.listInstalledBooks()` on mount. Returns SWORD book modules plus `md:` prefixed Markdown book modules.
- **Selected module** — derived from `bookReader.module`; selecting a sidebar item calls `onBookChange({ module: selectedModule, scrollY: 0 })`.
- **Mobile two-panel pattern:**
  - When no book is open (or on small screens): sidebar is shown, BookPane is hidden.
  - When a book is open on mobile: BookPane fills the screen; a back button resets `bookReader.module` to null.
- `BookPane` receives the active module and `onScrollChange` (calls `onBookChange` with updated scrollY, debounced).
- Restored scroll position: `bookReader.scrollY` is passed to `BookPane` which restores it after content loads.

## Dependencies

- `BookPane` — main book reading component.
- `api` (`../api/client.js`) — `listInstalledBooks`.

## Notes

- Always-mounted: switching to another AppShell view hides this component with CSS but does not unmount it, preserving the open book and scroll position.
- `bookReader` state lives in `AppShell` so that `BookPanel` (a separate slide-in component) can open the same book at the same scroll position.
- SWORD book modules include `RawGenBook` type modules; Markdown modules are prefixed `md:`.
