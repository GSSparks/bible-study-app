# frontend/src/utils/bibleRefDetect.js

**Purpose**

Scans plain text (typically PDF-extracted content) for Bible references and returns a deduplicated, normalized array of results. Handles a wide range of book name abbreviations and forms, chapter-only references, and verse ranges (including em-dash and en-dash variants). Results include a canonical `display` label and a `ref` string ready for use as a navigation target in the Cell view.

**Key exports / contents**

- `detectBibleRefs(text)` — main export; returns `Array<{ display: string, ref: string }>`.
  - `display` and `ref` are always the same value (canonical "Book Chapter:Verse" or "Book Chapter" form).
  - Deduplicates by display string.
  - Returns `[]` for null/undefined/empty input.
- `BOOKS` — internal array of 66 book objects with `name` and `abbrevs` (not exported).
- `ABBREV_TO_NAME` — internal `Map` from lowercase abbreviation → canonical name (not exported).
- `REF_RE` — internal `RegExp` for matching references (not exported); sorted longest-first to prevent short abbreviations matching before longer multi-word forms.

**Dependencies / relationships**

- No imports.
- Consumed by the PDF viewer's reference sidebar to extract navigable references from document text.
- Tested in `frontend/src/__tests__/utils/bibleRefDetect.test.js`.

**Notes**

- The alternation in `REF_RE` is sorted longest-first so `"Song of Solomon"` is matched before `"Song"`.
- Verse ranges use any of `-`, `–` (en-dash), or `—` (em-dash) as separators; the output normalizes to `–` (en-dash).
- Word boundaries (`\b`) at both ends of the pattern prevent partial matches like `"John 3:16something"`.
- The regex uses the `g` flag and is reset (`lastIndex = 0`) before each call to `detectBibleRefs`, which is necessary because the same compiled `REF_RE` object is reused.
