# frontend/src/components/TabStrip.jsx

## Purpose

The tab strip for a single Bible/commentary/dictionary window region in the Cell's `WorkspaceLayout`. Always renders even with zero tabs so the `+` add-tab button stays visible. Each tab button shows an abbreviated title, a `ModulePicker` dropdown (▾) to swap the module without closing, and a close button (hidden when only one tab remains). The strip label ("Bible", "Commentary", "Reference") comes from `KIND_LABEL`.

## Props

| Prop | Type | Description |
|---|---|---|
| `kind` | string | `'bible'`, `'commentary'`, or `'dictionary'` |
| `tabs` | array | `[{ id, title }]` |
| `activeTabId` | string | Currently active tab |
| `onSetActiveTab` | func | `(tabId) => void` |
| `onCloseTab` | func | `(tabId) => void` |
| `onSwapTabModule` | func | `(tabId, module, title, moduleType) => void` |
| `onAddTab` | func | `(module, title, moduleType) => void` |

## State / Key Logic

- No internal state.
- `useHorizontalScroll` on the inner container allows scroll by mouse wheel when many tabs are open.
- `abbreviateTitle` from `utils/abbreviateTitle.js` shortens long module descriptions for the tab button label.
- The trailing `ModulePicker` with `label="+"` adds a new tab.

## Dependencies

- `ModulePicker`
- `abbreviateTitle` from `utils/abbreviateTitle.js`
- `useHorizontalScroll` from `hooks/useHorizontalScroll.js`

## Notes

- `excludeModules` is passed as `[]` — TabStrip deliberately allows the same version open in multiple tabs (e.g. two ESV panes).
- `DocumentTabStrip` is a parallel component for the Documents window type with identical structure but `DocumentPicker` instead of `ModulePicker`.
