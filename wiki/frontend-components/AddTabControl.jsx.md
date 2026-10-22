# frontend/src/components/AddTabControl.jsx

## Purpose

An in-window "+" button that opens an installed-module list so the user can add another version as a new tab within the same Cell region. This is a simpler, inline alternative to `ModulePicker` — it renders its own dropdown as a non-portal absolute-positioned list, appropriate for its fixed position at the end of a tab strip in a container without overflow clipping.

## Props

| Prop | Type | Description |
|---|---|---|
| `kind` | string | `'bible'`, `'commentary'`, or `'dictionary'` |
| `existingModules` | string[] | Already-open module codes; these are filtered out of the available list |
| `onAdd` | func | `(moduleName, moduleTitle) => void` |

## State / Key Logic

- `open` — controls the dropdown visibility.
- `options` — fetched from `api.listInstalledModules(TYPE_BY_KIND[kind])` when the dropdown opens.
- `available = options.filter((m) => !existingModules.includes(m.name))` — removes already-open modules from the list.
- If `available.length === 0` and `options.length > 0`, shows "All installed ones are already open."

## Dependencies

- `api.listInstalledModules`

## Notes

- Unlike `ModulePicker`, this component does NOT use `createPortal` — it renders the list as a direct absolute-positioned child. This is acceptable here because `AddTabControl` is used at the end of `TabStrip` where the container does not have `overflow-hidden`.
- `TabStrip` now uses `ModulePicker` directly (which does use a portal), so `AddTabControl` may be used primarily in older or simpler contexts.
