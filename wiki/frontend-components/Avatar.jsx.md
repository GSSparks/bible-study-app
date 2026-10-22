# frontend/src/components/Avatar.jsx

## Purpose

Renders a user avatar: either the uploaded photo (via `avatarUrl`) or a generated coloured circle with initials. Used throughout social features (PostFeed, AvatarRoll, profile headers). The colour and initials are deterministically derived from the username so they are always the same across sessions.

## Props

| Prop | Type | Description |
|---|---|---|
| `username` | string | Used for initials and deterministic colour selection |
| `avatarUrl` | string | If provided, renders an `<img>` instead of the generated avatar |
| `size` | number | Width and height in pixels; default 32 |
| `className` | string | Additional CSS classes |

## State / Key Logic

- No internal state.
- `getAvatarColor(username)` and `getAvatarInitials(username)` from `utils/avatar.js` generate consistent colour and 1–2 character initials.
- Font size for initials is `size * 0.4`.

## Dependencies

- `getAvatarColor`, `getAvatarInitials` from `utils/avatar.js`

## Notes

- `avatarUrl` fallback to initials avatar means the component works for all users regardless of whether they have uploaded a photo.
