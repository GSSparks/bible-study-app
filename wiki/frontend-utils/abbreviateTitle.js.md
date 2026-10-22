# frontend/src/utils/abbreviateTitle.js

**Purpose**

Shortens module display titles to fit within tab labels (default max 22 characters) without losing meaning. Commentaries and lexicons from the SWORD library often have very long titles like "Adam Clarke's Commentary on the Old and New Testaments, with Critical Notes on the Whole Bible" — this utility trims them down to something like "Adam Clarke" that fits in a tab strip.

**Key exports / contents**

- `abbreviateTitle(title, maxLen?)` — function that returns a shortened string. Rules applied in order until the result fits:
  1. Strip common trailing filler phrases (regex array `TRAILING_FILLER`): "…and critical notes on the Bible", "…on the whole Bible", "…to the whole Bible", "…(parenthetical)", etc.
  2. Convert possessive form: "Matthew Henry's Commentary" → "Matthew Henry".
  3. Word-boundary truncation at the last space within `maxLen + 1` characters.
- Does not export `TRAILING_FILLER` (internal constant).

**Dependencies / relationships**

- No imports.
- Consumed by tab-rendering code in `WorkspaceLayout.jsx`, `MainLayout.jsx`, and any component that displays module names in a tab label.

**Notes**

- Always provide the original full title as a `title` tooltip alongside the abbreviated label so users can see the full name on hover.
- The function returns the original string unchanged if it is already within `maxLen`, so it is safe to call unconditionally.
- `maxLen` defaults to `22` characters — calibrated for the tab strip width in the workspace layout.
