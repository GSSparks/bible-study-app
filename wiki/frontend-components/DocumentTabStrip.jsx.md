# frontend/src/components/DocumentTabStrip.jsx

## Purpose

Tab strip for the Documents window type in the Cell environment. Mirrors `TabStrip` structurally but uses `DocumentPicker` (document library) instead of `ModulePicker` (SWORD modules) for adding and swapping tabs. Supports horizontal scroll via `useHorizontalScroll`.

## Props

| Prop | Type | Description |
|---|---|---|
| `tabs` | array | `[{ id, title }]` |
| `activeTabId` | string | Currently active tab |
| `onSetActiveTab` | func | `(tabId) => void` |
| `onCloseTab` | func | `(tabId) => void` (close button hidden when only one tab remains) |
| `onSwapTab` | func | `(tabId, docId, title) => void` — replace the document in a tab |
| `onAddTab` | func | `(docId, title) => void` — open a document in a new tab |

## State / Key Logic

- No internal state.
- Uses `useHorizontalScroll` hook on the inner tab container for mouse-wheel horizontal scrolling.
- Each tab has a `DocumentPicker` with `label="▾"` for swapping and a close button.
- The strip's leading `"+"` `DocumentPicker` adds a new tab.

## Dependencies

- `DocumentPicker`
- `useHorizontalScroll` from `hooks/useHorizontalScroll.js`

## Notes

- Intentionally parallel to `TabStrip` — the two components serve the same visual/behavioral role, just for different content types.
