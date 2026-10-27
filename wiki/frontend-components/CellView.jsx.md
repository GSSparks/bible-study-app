# frontend/src/components/CellView.jsx

## Purpose

Main Bible study workspace. Always-mounted in `AppShell`. Hosts `WorkspaceLayout` (the drag-and-drop window manager) and owns all Cell-specific state: focused reference, navigation history, drawer state, pending cross-pane actions, and nonce-based communication with other views.

## Props

| Prop | Type | Description |
|---|---|---|
| `isActive` | boolean | CSS visibility toggle (always-mounted pattern) |
| `auth` | object | `{ user, isLoggedIn }` |
| `defaultBibleModule` | string | Loaded from localStorage; passed into workspace |
| `pendingBibleOpen` | object \| null | Nonce from AppShell to open a reference in CellView |
| `onPendingBibleOpenHandled` | function | Called after pendingBibleOpen nonce is consumed |
| `pendingAiOverview` | object \| null | Nonce to trigger passage overview in passageguide pane |
| `pendingAiPhraseStudy` | object \| null | Nonce to trigger phrase study |
| `onAiRequestHandled` | function | Called after AI nonce is consumed |
| `onOpenBiblePanel` | function | Tells AppShell to open BiblePanel |
| `onOpenBookPanel` | function | Tells AppShell to open BookPanel |

## State / key logic

**Core navigation state:**
- `focusedReference` — current Bible reference string. Persisted to `localStorage` as `cell_reference`. Updated by `onNavigate`.
- `navHistory` — array of `{ reference, module }` objects. Persisted to `localStorage` as `cell_history`. Back/forward arrows in toolbar navigate through this stack.

**Drawer state:**
- `strongsDrawer` — `{ open, strongsKey, module }`. Opened when user taps a Strong's number in Bible text. On mobile renders as `StrongsDrawer` bottom-sheet.
- `verseDrawer` — `{ open, reference, module }`. Opened on verse long-press/click. Contains highlight color pickers, note creation, and cross-ref access.

**Cross-pane pending actions:**
- `pendingDictKey` / `pendingDictFilter` / `pendingDictTabId` — dispatched when `openStrongsInDictionary` wants to navigate a specific Dictionary pane to a Strong's entry.
- `pendingAiRequest` — nonce object sent to the passageguide pane (StudyAssistant or AIChatPane) to trigger overview/word/phrase study.
- `pendingSearch` — nonce object sent to the Search pane. Shape: `{ query, module, tab, nonce }` where `tab` is `'bible'` or `'commentary'`.
- `commentaryRefreshNonce` / `dictionaryRefreshNonce` — incrementing integers to force specific pane types to reload their content.

**`useWorkspaceLayout()`** — manages the pane grid (columns × rows), pane type assignment, drag-and-drop state. Returns `{ layout, dispatch }` passed to `WorkspaceLayout`.

**Key methods:**
- `openExternalRef(ref, module)` — smart-router: if a Bible/commentary tab already has the same book open, reuse it (update chapter only); otherwise open a new tab. Prevents duplicate tabs for consecutive chapter navigation.
- `openVerseTab(reference, module)` — finds an existing Bible tab and updates it, or opens a new one.
- `openStrongsInDictionary(strongsKey, module)` — finds the first installed Strong's dictionary module (Hebrew or Greek based on key prefix) and dispatches `pendingDictKey` to target its tab.
- `routeToAiChat(request)` — finds an existing passageguide pane or creates one, then sets `pendingAiRequest`.
- `routeToCommentarySearch(query)` — finds an existing Search pane or creates one, then sets `pendingSearch` with `tab: 'commentary'`. Called by `SearchBar`'s `onCommentarySearch` prop.

**Keyboard shortcuts (within Cell):**
- `/` — focuses the search input.
- `ArrowLeft` / `ArrowRight` — navigates the focused reference to the previous/next chapter.

**WINDOW_TOGGLES:** Icon button array in the Cell toolbar for toggling specific pane types on/off (bible, commentary, dictionary, passageguide, search).

## Dependencies

- `useWorkspaceLayout` (`../hooks/useWorkspaceLayout.js`)
- `WorkspaceLayout` — renders the pane grid.
- `api` (`../api/client.js`)

## Notes

- Always-mounted: the entire Cell state (open tabs, scroll positions, drawer state) is preserved when navigating away from the Cell view and back.
- `focusedReference` and `navHistory` are persisted to `localStorage` so they survive page refresh.
- The `openExternalRef` smart router prevents a common UX annoyance where clicking a cross-reference link in commentary opens a new tab for a book that is already open nearby.
- Strong's key prefix: `H` = Hebrew → looks for a Hebrew lexicon; `G` = Greek → looks for Greek lexicon (e.g. BDB, LSJM, StrongsGreek).
