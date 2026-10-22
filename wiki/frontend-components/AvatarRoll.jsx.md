# frontend/src/components/AvatarRoll.jsx

## Purpose

Renders a horizontal overlapping stack of avatar circles (up to `max` visible) with an overflow count badge for additional members. Used in Scriptorium and Study group membership displays. Each visible avatar is clickable to view that user's profile; the overflow badge is separately clickable (e.g. to open a full members list).

## Props

| Prop | Type | Description |
|---|---|---|
| `members` | array | `[{ id?, username, displayName?, avatarUrl? }]` |
| `total` | number | Total member count (may exceed `members.length`); defaults to `members.length` |
| `max` | number | Maximum avatars to show before overflow; default 5 |
| `onMemberClick` | func | `(username) => void` — called on avatar click |
| `onOverflowClick` | func | Called on the `+N` overflow button |

## State / Key Logic

- No internal state.
- `visible = members.slice(0, max)`.
- `overflow = (total ?? members.length) - visible.length`.
- Avatars overlap with `marginLeft: -8px` and decreasing `zIndex` so the leftmost avatar is always on top.
- Returns `null` when `visible.length === 0`.

## Dependencies

- `Avatar`

## Notes

- The `total` prop is separate from `members.length` because callers may pass only the first N members (for performance) but know the full count from the server.
