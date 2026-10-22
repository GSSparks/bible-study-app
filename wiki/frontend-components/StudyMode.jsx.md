# frontend/src/components/StudyMode.jsx

## Purpose

Legacy three-pane study mode. Composes `MainLayout` (Bible/Dictionary/Commentary) with a right-docked `StudyAssistant` panel. In current production navigation this is superseded by `CellView` + `WorkspaceLayout`, but it remains in the codebase and may be referenced by older routes or embedded contexts.

## Props

| Prop | Type | Description |
|---|---|---|
| `auth` | object | `{ user, isLoggedIn }` |
| `defaultBibleModule` | string | Default Bible module for new tabs |
| `initialReference` | string \| null | Reference to open on mount |

## State / key logic

- `useTabbedWindow` (×3) — one each for `bible`, `commentary`, `dictionary` tabs. Passed to `MainLayout`.
- `focusedReference` — tracks the currently-focused Bible reference. Updated on navigation in `MainLayout`.
- `useResizableWidth` — controls the width of the `StudyAssistant` dock on the right side. Draggable vertical divider.
- **`StrongsPopup` (click-positioned):** Unlike `CellView` which uses a bottom-sheet drawer, `StudyMode` renders Strong's definitions as a click-positioned floating popup (mouse coordinates tracked on word click).
- `openStrongsInDictionary` — queries `api.listInstalledModules('DICT')` to find the appropriate Hebrew/Greek lexicon, then dispatches `pendingDictKey` to the dictionary tab.
- `openTopicalSearch` — similar logic to find a topical dictionary module and open a key.

**`StudyAssistant` dock:**
- Right panel, always visible when study mode is active.
- Width controlled by `useResizableWidth`.
- Receives `focusedReference` and `defaultBibleModule` as context.

## Dependencies

- `MainLayout` — three-pane Bible/Dictionary/Commentary layout.
- `StudyAssistant` — AI chat panel.
- `useTabbedWindow` (`../hooks/useTabbedWindow.js`)
- `useResizableWidth` (`../hooks/useResizableWidth.js`)
- `api` (`../api/client.js`)

## Notes

- This component predates `WorkspaceLayout`. The main difference is that `MainLayout` has a fixed three-pane structure, whereas `WorkspaceLayout` supports arbitrary pane counts and types.
- `StrongsPopup` (floating, click-positioned) vs `StrongsDrawer` (bottom-sheet) — the popup is used here for desktop-only legacy UX.
- If this component is removed in the future, its `openStrongsInDictionary` and `openTopicalSearch` logic can be found duplicated in `CellView.jsx` (which has the same functionality but dispatches to the workspace layout).
