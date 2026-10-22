# frontend/src/utils/avatar.js

**Purpose**

Generates deterministic avatar colors and initials from usernames, so every user has a distinct, stable "generated" avatar without requiring a photo upload or an external avatar service. The same username always produces the same color and initials, making avatars consistent across page loads and between different users viewing the same profile.

**Key exports / contents**

- `getAvatarColor(username)` — returns one of eight hex color strings from the `PALETTE` array, chosen by hashing the username. Colors are drawn from the app's design tokens: brass, verdigris, pageAccent, red-letter red, and four additional blues/purples/greens.
- `getAvatarInitials(username)` — returns 1–2 uppercase characters:
  - For usernames with separators (space, `.`, `_`, `-`): takes the first character of the first two parts, e.g., `john.doe` → `JD`.
  - For single-word usernames: returns the first two characters, e.g., `alice` → `AL`.
  - Returns `'?'` for falsy input.
- `PALETTE` — internal constant (not exported); eight hex color strings.
- `hashString(str)` — internal djb2-style hash (not exported).

**Dependencies / relationships**

- No imports.
- Consumed by user avatar components throughout the application (profile headers, comment authors, connection cards, etc.).

**Notes**

- The hash function is a standard djb2 variant (`hash = (hash << 5) - hash + charCode`), coerced to a 32-bit int. It is not cryptographic but is sufficient for stable aesthetic distribution.
- The palette deliberately uses colors already defined in `tailwind.config.js` to keep the generated avatars visually consistent with the rest of the UI.
