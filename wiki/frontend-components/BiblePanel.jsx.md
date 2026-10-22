# frontend/src/components/BiblePanel.jsx

## Purpose

Slide-in Bible reading panel accessible from any view. Always-mounted at the root level in `AppShell`; visibility toggled by CSS `transform: translateX`. Provides quick Bible reading, Strong's word lookup, verse actions, and cross-view deep-link navigation without leaving the current view.

## Props

| Prop | Type | Description |
|---|---|---|
| `isOpen` | boolean | Controls visibility (translateX(0) vs translateX(100%)) |
| `onClose` | function | Closes the panel |
| `defaultBibleModule` | string | Module to use for new tabs |
| `pendingOpen` | object \| null | Nonce object `{ nonce, module, reference }` — triggers navigation from other views |
| `onPendingOpenHandled` | function | Called after pendingOpen nonce is consumed |
| `auth` | object | `{ user, isLoggedIn }` |

## State / key logic

- `useTabbedWindow` — manages multiple Bible reading tabs within the panel. Each tab has its own module and reference.
- `focusedReference` — tracks the currently visible reference across tabs; kept in sync with the active tab's scroll position.
- **Nav history** — back/forward buttons with a history stack per panel session.
- **`pendingOpen` nonce watch:** `useEffect` on `pendingOpen?.nonce`; skips if nonce matches `handledNonceRef.current`. On new nonce: opens the panel, navigates the active tab to the specified reference/module, and calls `onPendingOpenHandled`.
- `StrongsDrawer` — rendered inline at the bottom of the panel for Strong's number lookups triggered by tapping a word.
- `VerseDrawer` — rendered inline at the bottom for verse options (highlights, notes, cross-refs).
- `SearchBar` in the header for quick reference input.
- Panel width: 600px on `sm+` screens; full-width on mobile.
- Keyboard shortcut: `Ctrl+B` toggles `isOpen` (handled in `AppShell`).

## Dependencies

- `useTabbedWindow` (`../hooks/useTabbedWindow.js`)
- `ReaderPane` — renders Bible text within each tab.
- `StrongsDrawer`, `VerseDrawer` — overlay drawers for word study and verse actions.
- `SearchBar` — reference input in the panel header.
- `api` (`../api/client.js`)

## Notes

- Always-mounted pattern: `transform: translateX` toggling instead of conditional render ensures tab state, scroll position, and in-flight requests are preserved when the panel is hidden.
- The panel sits above other content (high z-index) and includes a backdrop click handler to close.
- `pendingOpen` is the standard nonce-based deep-link mechanism used throughout Scriptorium for cross-view navigation without a router.
