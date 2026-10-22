# frontend/src/components/ModulePicker.jsx

## Purpose

A small trigger button that opens a portal-rendered dropdown listing installed modules of a given kind (`bible`, `commentary`, or `dictionary`). Used inside `TabStrip` and `AddTabControl` to let users swap or add a module tab without navigating away. Renders into `document.body` via a portal to escape `overflow-hidden` ancestors that would otherwise clip the dropdown.

## Props

| Prop | Type | Description |
|---|---|---|
| `kind` | string | `'bible'`, `'commentary'`, or `'dictionary'` — determines which installed modules are listed |
| `excludeModules` | array | Module names to omit from the list (e.g. already-open tabs); defaults to `[]` |
| `label` | string | Text label for the trigger button |
| `title` | string | Tooltip for the trigger button |
| `onSelect` | func | `(moduleName, moduleDescription, moduleType) => void` — called when the user picks a module |

## State / Key Logic

- `open` — controls dropdown visibility.
- `options` — fetched from `api.listInstalledModules` when the dropdown first opens; keyed to `open` and `kind`.
- `pos` — `{ top, left }` fixed position computed from the trigger button's `getBoundingClientRect()`. Left is clamped to `window.innerWidth - 224 - 8` to prevent right-edge overflow.
- A `mousedown` document listener closes the dropdown when the user clicks outside both the trigger button and the list (`[data-module-picker-list]`). The listener is added only while `open` is true and removed on cleanup.
- `available` filters `options` by removing any names in `excludeModules` before rendering.
- The dropdown is a `fixed` `z-50` element rendered into `document.body` to sidestep `overflow-hidden` clipping in tiled window panes.

## Dependencies

- `createPortal`
- `api.listInstalledModules`

## Notes

- The portal pattern is essential here: pane containers use `overflow-hidden` for their own scroll clipping, which would cut off a normally-positioned dropdown. Rendering into `document.body` is the standard workaround used throughout the app (see also `UserMenu`, `BookChapterPicker`).
- `onSelect` receives `moduleType` (the raw SWORD type string) in addition to name and description, which some callers use to distinguish SWORD from Markdown modules.
