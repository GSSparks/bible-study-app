# frontend/src/components/UserMenu.jsx

## Purpose

An avatar-triggered account dropdown menu in the sidebar. Accepts a configurable `items` array so new menu options can be added by callers without modifying this component. "Log out" is pinned at the bottom as a separate destructive action. Uses the portal + full-screen click-catcher pattern. Flips the menu above the trigger when there is insufficient space below.

## Props

| Prop | Type | Description |
|---|---|---|
| `username` | string | Displayed in the header and button |
| `items` | array | `[{ label, onClick }]` — menu items above logout |
| `onLogout` | func | Called when "Log out" is clicked |

## State / Key Logic

- `open` and `pos` — `pos` is `{ right, top }` or `{ right, bottom }` depending on available viewport space.
- Flip logic: estimates menu height from item count, then compares `spaceBelow` to the estimate.
- `toggle` opens or closes; position is computed on open.

## Dependencies

- `createPortal`

## Notes

- `items` is a plain array rather than JSX so the component stays data-driven and doesn't need to be modified for future additions.
- `right` is computed as `window.innerWidth - rect.right` to keep the menu right-aligned with the trigger button regardless of window width.
