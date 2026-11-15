# frontend/src/components/ShareDialog.jsx

## Purpose

Modal dialog for sharing a calendar layer with other users. Provides a search box to find users by name or username (via `api.searchFellows`), a role selector (viewer/editor), a list of search results with a "Share" button on each, and a "Shared with" list showing current shares with per-share role change and remove controls.

## Props

| Prop | Type | Description |
|---|---|---|
| `layer` | object \| null | The layer to share; dialog renders nothing if `null` |
| `open` | boolean | Controls visibility; also triggers `loadShares` on open |
| `onClose` | function | Called to dismiss the modal |

## State / key logic

**Search:**
- `query` — text input, minimum 2 characters to trigger a search.
- Debounced 250 ms via `setTimeout`; calls `api.searchFellows(query)` and filters out users already in `shares`.
- `loading` — shows a `…` indicator inside the input while fetching.

**Role:**
- `role` state — `'viewer'` or `'editor'`, applied to new shares added from the results list.

**Shares list:**
- `loadShares(layerId)` — calls `api.listLayerShares(layerId)` and stores in `shares`.
- Called on open (via `useEffect`) and after every mutation (add, change, remove).
- Each share row shows avatar or initial, display name, a role `<select>` dropdown, and a "Remove" button.
- `changeRole` — removes the existing share and re-adds with the new role (there is no PATCH endpoint; it's unshare + reshare).
- `removeShare(userId)` — calls `api.unshareCalendarLayer`.

**Add share:**
- `addShare(user)` — calls `api.shareCalendarLayer(layer.id, user.username, role)`, clears the query/results, and reloads shares.

## Dependencies

- `api` — `searchFellows`, `listLayerShares`, `shareCalendarLayer`, `unshareCalendarLayer`

## Notes

- The modal renders `null` when `!open || !layer`, keeping it cheap when unused.
- Clicking the backdrop (`fixed inset-0`) calls `onClose`; clicking inside the dialog calls `e.stopPropagation()` to prevent close.
- The `inputRef` is focused automatically when the dialog opens.
- In `CalendarTab.jsx`, a single `ShareDialog` instance is rendered outside the layers map and controlled by a `shareLayer` state variable — only one dialog instance exists regardless of layer count.
