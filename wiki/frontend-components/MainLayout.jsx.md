# frontend/src/components/MainLayout.jsx

## Purpose

Legacy three-pane reading layout: Bible top-left, Dictionary bottom-left, Commentary right. Used directly by `StudyMode` and kept as a reference implementation. In new Cell-based navigation it is superseded by `WorkspaceLayout`, but it remains in the codebase.

## Props

| Prop | Type | Description |
|---|---|---|
| `bible` | useTabbedWindow instance | Tab manager for the Bible pane |
| `commentary` | useTabbedWindow instance | Tab manager for the Commentary pane |
| `dictionary` | useTabbedWindow instance | Tab manager for the Dictionary pane |
| `focusedReference` | string | Current Bible reference (e.g. `"John 3:16"`) |
| `pendingDictKey` | string | Dictionary entry key to open |
| `pendingDictFilter` | string | Pre-filled filter text for dictionary |
| `pendingDictTabId` | string | Tab ID to target for dictionary action |
| `onNavigate` | function | Called when user navigates to a reference |
| `onDictKeyHandled` | function | Called after pendingDictKey is consumed |
| `verseDrawer` | object | State/handlers for the verse-options drawer |
| `defaultBibleModule` | string | Module to use when opening new Bible tabs |

## State / key logic

- `useResizableWidth` — manages the commentary column width with a draggable vertical divider.
- `useResizableHeight` — manages the dictionary pane height within the left column, with a draggable horizontal divider.
- Each pane (Bible, Commentary, Dictionary) renders a tab strip (`useTabbedWindow` tabs) and its appropriate pane component:
  - Bible → `ReaderPane`
  - Commentary → `CommentaryPane` (receives `bibleModule={defaultBibleModule}` for hover-card verse lookups; phrase-study and `onAnnotate` props are omitted)
  - Dictionary → `DictionaryPane`
- Tabs stay mounted; CSS `visibility` / `display` toggling preserves scroll position across tab switches.
- `VerseDrawer` is rendered at the bottom of the layout as a slide-up panel for verse options (cross-refs, highlights, notes).

## Dependencies

- `useResizableWidth`, `useResizableHeight` (`../hooks/`)
- `ReaderPane` — renders Bible content.
- `CommentaryPane` — renders commentary content with highlights, note indicators, and phrase selection.
- `DictionaryPane` — renders dictionary/reference entries.
- `VerseDrawer` — verse-action bottom sheet.

## Notes

- This component is considered legacy. New study sessions use `WorkspaceLayout` inside `CellView` which supports arbitrary pane tiling and drag-to-rearrange.
- The three-pane approach (Bible | Dictionary | Commentary) matches the original Scriptorium desktop layout concept.
- No global state — all state flows through props from `StudyMode` or the parent.
