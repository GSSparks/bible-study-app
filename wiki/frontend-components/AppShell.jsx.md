# frontend/src/components/AppShell.jsx

## Purpose

Root layout component for the entire Scriptorium application. Renders the sidebar navigation, mounts all always-on views, dispatches between views based on URL pathname, holds all cross-view state, and renders the always-mounted slide-in panels (BiblePanel, BookPanel, NotePanel).

## Props

None — this is the top-level component rendered by `main.jsx` / `App.jsx`. It consumes `useAuth()` internally.

## State / key logic

**Navigation:**
- `currentView` — derived from `location.pathname` on each render (no React Router `<Route>`). Values: `cell`, `scriptoriums`, `library`, `notes`, `books`, `map`, `fellows`, `settings`, `admin`, `cursus`, `ai`.
- `lastScriptoriumPath` ref — remembers the last Scriptoriums URL so back-navigation from a study restores the group page.

**Always-mounted views** (CSS `hidden` / `h-full` toggling, never unmounted):
- `CellView`, `ScriptoriumsView`, `LibraryView`, `NotesView`, `BooksView`, `BibleMapView`

**Conditionally rendered views** (mounted only when active):
- `SettingsView`, `AdminView`, `CursusView`, `FellowsView`, `AICompanionView`

**Panels (always-mounted slide-ins at root):**
- `BiblePanel` — toggled by `biblePanelOpen`; keyboard shortcut Ctrl+B.
- `BookPanel` — toggled by `bookPanelOpen`; keyboard shortcut Ctrl+K.
- `NotePanel` — toggled by `notePanelOpen`; keyboard shortcut Ctrl+\`.

**Cross-view state (lifted here for inter-component communication):**

| State | Purpose |
|---|---|
| `biblePanelOpen` | Shows/hides BiblePanel slide-in |
| `bookPanelOpen` | Shows/hides BookPanel slide-in |
| `notePanelOpen` | Shows/hides NotePanel slide-in |
| `bookReader` | `{ module, scrollY }` — shared between BooksView and BookPanel |
| `defaultBibleModule` | Persisted to `localStorage`; default module for Bible panes |
| `brandName` | Loaded from `api.getAppSettings()` |
| `pendingBibleOpen` | Nonce object `{ nonce, module, reference }` — tells BiblePanel to navigate to a reference from any other view |
| `pendingAiOverview` | Nonce object — triggers passage overview in AI pane |
| `pendingAiPhraseStudy` | Nonce object — triggers phrase study in AI pane |
| `pendingAiDocument` | Nonce object — triggers document chat in AI pane |
| `pendingCodexQuery` | Nonce object — triggers a Codex/dictionary query |

**Nonce pattern:** Cross-view deep links use `{ nonce: Date.now(), ...payload }`. The receiving component watches `pendingX?.nonce` in a `useEffect` and skips if nonce matches a `handledNonceRef` — prevents re-running the same action on unrelated re-renders.

**NAV_GROUPS array:** Defines sidebar structure — icon, label, view key, admin-only flag. Rendered as grouped `<button>` elements in both desktop sidebar and mobile drawer.

**Mobile sidebar:** Rendered as a full-screen drawer (`fixed inset-0 z-40`), toggled by a hamburger button in the mobile top bar.

## Dependencies

- `useAuth` (`../hooks/useAuth.js`) — provides `user`, `loading`, `setupRequired`, `login`, `logout`, `bootstrap`.
- `api` (`../api/client.js`) — `getAppSettings` for brand name.
- `CellView`, `ScriptoriumsView`, `LibraryView`, `NotesView`, `BooksView`, `BibleMapView` — always-mounted.
- `SettingsView`, `AdminView`, `CursusView`, `FellowsView`, `AICompanionView` — conditionally rendered.
- `BiblePanel`, `BookPanel`, `NotePanel` — always-mounted slide-in overlays.
- `BootstrapScreen` — rendered instead of everything else when `setupRequired` is true.
- `LoginModal` — rendered as overlay when `!user && !setupRequired`.

## Notes

- The URL is the source of truth for which view is active, but React Router's `<Route>` system is not used — `location.pathname` is parsed manually.
- `defaultBibleModule` is read from `localStorage` on mount and written back on change via `setDefaultBibleModule`.
- All always-mounted views receive their visibility state as a prop (typically `isActive` or checked via inline `className` toggle) — they must never be conditionally rendered or their tab/scroll state is lost.
