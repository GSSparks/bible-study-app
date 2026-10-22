# frontend/src/__tests__/utils/bibleRefDetect.test.js

**Purpose**

Unit tests for `frontend/src/utils/bibleRefDetect.js`. Verifies that `detectBibleRefs` correctly handles null/undefined/empty input, recognizes well-known references in full and abbreviated forms, normalizes abbreviations to canonical book names, handles chapter-only and verse-range references, deduplicates repeated references, enforces word boundaries, and returns results with the expected `{ display, ref }` shape.

**Key exports / contents**

No exports — test file only. Test suites:

- **empty / null input** — null, undefined, empty string, and no-match text all return `[]`.
- **well-known references** — `"John 3:16"` and `"Genesis 1:1"` detected and returned verbatim.
- **abbreviation normalization** — `"Jn 3:16"` → `"John 3:16"`, `"Rom 8:28"` → `"Romans 8:28"`, `"Matt 5:1"` → `"Matthew 5:1"`.
- **chapter-only references** — `"Psalm 23"` and `"John 3"` detected without verse numbers.
- **verse ranges** — `"Matt 5:1-12"` produces `"Matthew 5:1–12"` (en-dash), existing en-dash ranges work too.
- **deduplication** — repeated `"John 3:16"` in a paragraph yields only one result.
- **multiple references** — paragraph with three different references returns all three.
- **NT books** — `"Rev 22:20"` and `"1 Cor 13:4"` recognized.
- **numbered books** — `"1 Samuel 17:4"` and `"2 Kings 5:1"` recognized.
- **word boundary enforcement** — `"John 3:16something"` does not match `"John 3:16"`.
- **result shape** — `display` and `ref` are always the same value.

**Dependencies / relationships**

- `vitest` — `describe`, `it`, `expect`.
- `../../utils/bibleRefDetect.js` — the module under test.

**Notes**

- Tests run in the jsdom environment (configured in `vitest.config.js`), though `detectBibleRefs` does not use DOM APIs — it operates on plain strings.
- The word boundary test documents a known regex behavior: `"John 3:16something"` should not match because the `\b` after the verse number fails when the following character is a letter.
