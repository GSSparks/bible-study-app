# frontend/src/components/DocumentPicker.jsx

## Purpose

A compact dropdown picker for the document library, used in `DocumentTabStrip` to change or add documents in Cell window tabs. Mirrors the UX pattern of `ModulePicker` (portal-rendered, fixed-position list) but fetches from the document library instead of installed SWORD modules. Lazy-loads the document list on first open.

## Props

| Prop | Type | Description |
|---|---|---|
| `label` | string | Button label (typically `"+"` for add or `"▾"` for swap) |
| `title` | string | Button `title` attribute (tooltip text) |
| `onSelect` | func | `(docId, title) => void` — called when a document is selected |

## State / Key Logic

- `open` / `docs` / `pos` — list is fetched from `api.listDocuments()` when the dropdown opens. Position is computed from the button's bounding rect.
- Uses a `mousedown` listener on `document` (not a backdrop div) to close when clicking outside, with guards for the button and the list.
- Renders the list via `createPortal` with `data-doc-picker-list` attribute so the outside-click handler can exclude it.

## Dependencies

- `api.listDocuments`
- `createPortal`

## Notes

- Intentionally structurally identical to `ModulePicker` to maintain visual/behavioral consistency between Bible-module tabs and document tabs in the Cell window system.
