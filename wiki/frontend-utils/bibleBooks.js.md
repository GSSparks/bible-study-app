# frontend/src/utils/bibleBooks.js

**Purpose**

Exports the canonical Bible book list as a structured data array for use in UI pickers (book/chapter navigation dropdowns). It mirrors the backend's `BIBLE_BOOKS` table in `swordService.js` but is kept as a separate frontend module because the backend uses CommonJS / Node-adjacent code and this file is bundled into the browser. In addition to OSIS codes and chapter counts, it adds human-readable `name` strings needed for picker labels.

**Key exports / contents**

- `BIBLE_BOOKS` — array of 66 objects, one per canonical Bible book, each with:
  - `osis` — OSIS abbreviation (e.g., `'Gen'`, `'Matt'`, `'Rev'`).
  - `name` — full human-readable name (e.g., `'Genesis'`, `'Matthew'`, `'Revelation'`).
  - `chapters` — total chapter count.
  - `testament` — `'OT'` or `'NT'`.

**Dependencies / relationships**

- No imports.
- Consumed by Bible navigation UI components (book/chapter pickers) that need to enumerate all books with their chapter counts.
- The backend equivalent is the `BIBLE_BOOKS` array in `backend/src/services/swordService.js`.

**Notes**

- Books are listed in canonical order: Old Testament (Genesis → Malachi), then New Testament (Matthew → Revelation).
- The `osis` codes match the OSIS standard used by the SWORD engine, so they can be used directly in API calls to `getPassage`.
