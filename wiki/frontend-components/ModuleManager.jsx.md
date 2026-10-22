# frontend/src/components/ModuleManager.jsx

## Purpose

An admin modal for browsing, installing, removing, and uploading SWORD modules. Presents three tabs (Bibles, Commentaries, Dictionaries & help books) and a two-column layout: left column browses modules available in a selected repository; right column shows currently installed modules. Modules can also be installed by uploading a `.zip` file directly. Installed Bible modules have a star button for setting the app-wide default translation.

## Props

| Prop | Type | Description |
|---|---|---|
| `onClose` | func | Dismiss the modal |
| `onOpenModule` | func | `({ kind, module, title }) => void` — open a just-installed module in a new pane |
| `onModulesChanged` | func | Called after any install or remove to let the parent refresh state |
| `defaultBibleModule` | string | Currently designated default Bible module name |
| `onSetDefaultBible` | func | `(moduleName) => void` — set the default Bible |

## State / Key Logic

- `moduleType` — `'BIBLE'`, `'COMMENTARY'`, or `'DICT'`; controls which tab is active and which modules are fetched.
- `repos` — list of repository strings fetched from `api.listRepositories()` on mount.
- `selectedRepo` — the currently selected repository; changing it re-fetches `available`.
- `available` — modules from the remote repo for the current type; updated when `selectedRepo` or `moduleType` changes.
- `installed` — modules installed locally for the current type; refreshed after install/remove.
- `installing` / `removing` — tracks the module code currently being operated on to disable buttons and show feedback.
- `uploading` / `uploadNote` — state for the zip-upload flow; uses a raw `fetch` to `POST /api/modules/upload` with `FormData`.
- `refreshInstalled()` re-fetches `installed` for the current `moduleType`; called after install, remove, and upload.
- On install, `handleInstall` calls `api.installModule(selectedRepo, moduleCode)`, then refreshes installed and fires `onModulesChanged`.
- On remove, `handleRemove` calls `api.removeModule(moduleCode)`, then refreshes.
- The star button (BIBLE tab only) fires `onSetDefaultBible(m.name)` and visually highlights the current default.

## Dependencies

- `api.listRepositories`, `api.listAvailableModules`, `api.installModule`, `api.removeModule`, `api.listInstalledModules`
- `fetch /api/modules/upload` (direct, not via `api` client)

## Notes

- Module installation is synchronous on the backend; the install button is disabled and shows "installing…" while in flight, but there is no progress indicator for large modules.
- `onOpenModule` receives a `kind` string (`'bible'`, `'commentary'`, `'dictionary'`) derived from `activeType.kind`, enabling the parent to open the module immediately after install without navigating away from the modal.
- The zip-upload flow is separate from the SWORD repository flow and always resets `e.target.value` after the upload completes or fails, allowing the same file to be re-submitted.
