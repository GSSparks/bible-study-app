# frontend/src/components/ChangePasswordModal.jsx

## Purpose

Modal dialog for changing the current user's password. Requires the user to provide their current password before setting a new one, protecting against session hijack scenarios.

## Props

| Prop | Type | Description |
|---|---|---|
| `onClose` | function | Called to dismiss the modal |

## State / key logic

- `currentPassword`, `newPassword`, `confirm` — controlled inputs.
- Client-side validation: new password ≥ 10 characters, `newPassword` matches `confirm`.
- `error` — displays validation or API error.
- `success` — boolean; shows a success message when the password change completes.
- On success, auto-closes after 1200 ms via `setTimeout`.
- Calls `api.changePassword({ currentPassword, newPassword })`.

## Dependencies

- `api` (`../api/client.js`) — `changePassword` endpoint.

## Notes

- No `onLogin` prop needed — the user is already authenticated.
- Auto-close on success avoids requiring an explicit button press after a successful change.
- Rendered from `SettingsView` when the user clicks "Change Password".
