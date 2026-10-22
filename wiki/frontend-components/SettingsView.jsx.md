# frontend/src/components/SettingsView.jsx

## Purpose

User settings page. Provides account management (password change) and reading preferences (default Bible module). Conditionally rendered (not always-mounted).

## Props

| Prop | Type | Description |
|---|---|---|
| `auth` | object | `{ user }` — displays current username |
| `defaultBibleModule` | string | Current default module (from localStorage via AppShell) |
| `onSetDefaultBibleModule` | function | Persists new default module selection to localStorage |

## State / key logic

**Account section:**
- Displays current username (read-only).
- "Change Password" button opens `ChangePasswordModal` (controlled by `showChangePassword` boolean state).

**Reading section:**
- Default Bible module selector — `<select>` populated by `api.listInstalledModules('BIBLE')`.
- On change, calls `onSetDefaultBibleModule(newModule)` which writes to `localStorage` in `AppShell`.
- Current selection controlled by `defaultBibleModule` prop.

**`ChangePasswordModal`:**
- Rendered as an overlay when `showChangePassword` is true.
- `onClose` sets `showChangePassword` to false.

## Dependencies

- `api` (`../api/client.js`) — `listInstalledModules('BIBLE')`.
- `ChangePasswordModal` — password change overlay.

## Notes

- This is a lean settings page — most configuration is handled elsewhere (admin settings in `AdminView`, per-scriptorium settings in `ScriptoriumDetail`).
- `defaultBibleModule` affects which module opens when clicking a verse link in notes, Scriptorium posts, and other contexts where no module is specified.
- The module list is filtered by `ModuleVisibility` for non-admin users — only modules the admin has enabled are shown.
