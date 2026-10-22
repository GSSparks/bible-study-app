# frontend/src/utils/osisToHuman.js

**Purpose**

Converts OSIS-format Bible references (the dot-separated format used by SWORD, e.g., `"John.3.16"`) into human-readable strings (e.g., `"John 3:16"`). Handles points (single verse), chapter-only references, and ranges where the start and end may be in the same chapter, the same book, or different books entirely.

**Key exports / contents**

- `osisToHuman(osis)` — function accepting a single OSIS string and returning a human-readable reference string.
  - Point `"John.3.16"` → `"John 3:16"`
  - Book-only `"John"` → `"John"` (book name resolved)
  - Chapter-only `"John.3"` → `"John 3"`
  - Same-book, same-chapter range `"Matt.5.1-Matt.5.12"` → `"Matt 5:1–12"`
  - Same-book, cross-chapter range `"Matt.5.1-Matt.6.2"` → `"Matt 5:1–6:2"`
  - Cross-book range `"John.3.16-Acts.1.1"` → `"John 3:16–Acts 1:1"`
- `BOOK_NAMES` — internal lookup object mapping OSIS codes to human names (not exported).

**Dependencies / relationships**

- No imports.
- Consumed by any component that displays OSIS references returned by the SWORD engine or cross-reference data — for example, cross-reference lists in the Cell pane and passage guide output.

**Notes**

- Range separator in the output is `–` (en-dash), not `-` (hyphen), following standard typographic convention for ranges.
- If a book code is not found in `BOOK_NAMES`, the raw code is passed through unchanged as a safe fallback.
- `parsePoint` splits on `.` and extracts `{ book, chapter, verse }` — `chapter` and `verse` may be `undefined` for book-only or chapter-only OSIS strings.
