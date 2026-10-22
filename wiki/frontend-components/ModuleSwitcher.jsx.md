# frontend/src/components/ModuleSwitcher.jsx

## Purpose

A compact `<select>` element for switching the active Bible translation. Fetches the list of installed Bible modules itself and re-fetches whenever `refreshKey` changes, allowing the parent to trigger a refresh after installing or removing a module via `ModuleManager`. Renders a plain text fallback when no Bible modules are installed.

## Props

| Prop | Type | Description |
|---|---|---|
| `module` | string | Currently selected module name (controlled) |
| `onChange` | func | `(moduleName) => void` — called when the user selects a different translation |
| `refreshKey` | any | Changing this value causes the installed module list to re-fetch |

## State / Key Logic

- `installed` — fetched from `api.listInstalledModules('BIBLE')` on mount and whenever `refreshKey` changes.
- Renders `null`-equivalent (`<span>` fallback) when `installed` is empty, avoiding a confusing empty `<select>`.
- An unset `module` prop causes a placeholder "select a version…" option to appear at the top.

## Dependencies

- `api.listInstalledModules`

## Notes

- `refreshKey` is the standard signal pattern used when a parent needs to invalidate child-owned fetch state without lifting the data up; bumping the key is less invasive than passing the whole module list as a prop.
- This is intentionally a thin, stateless-aside-from-fetch wrapper — all selection logic lives in the caller.
