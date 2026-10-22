# backend/src/services/referenceParser.js

## Purpose

All Bible reference parsing in the backend flows through this file. It wraps the `bible-passage-reference-parser` library (BCV parser) with two separately configured instances: one for converting human-typed references to OSIS strings (navigation, API input), and one for finding references embedded in running prose (commentary text link injection). It also exposes utility functions for splitting OSIS sequences, checking range vs. point, validating search-bar input, and locating reference offsets within arbitrary text.

## Key exports

- **`toOsis(humanReference)`** — Converts a human-typed reference to a verse-precise OSIS string. Supports single verses, ranges, whole chapters, whole books, and comma-separated sequences. Returns `null` for unrecognized input. Configured with `osis_compaction_strategy: 'bcv'` and `book_alone_strategy: 'full'` so bare book names and chapters always expand to full verse ranges.
- **`splitOsisSequence(osis)`** — Splits a comma-separated OSIS string into its component items (e.g. `"John.3.16,Rom.8.28"` → `["John.3.16", "Rom.8.28"]`).
- **`isRange(osisItem)`** — Returns `true` if an OSIS item contains a `-`, indicating a range rather than a single point.
- **`parseReferenceInfo(humanInput)`** — Lightweight wrapper for the search UI: returns `{ valid, osis }` so a caller can check if input looks like a reference without additional parsing.
- **`findReferencesInText(text, currentBookOsis)`** — Finds all Bible references embedded in a longer piece of text (e.g. commentary prose). Returns each reference's OSIS key and exact `{ start, end }` character offsets in the original string, sorted by position, so callers can wrap just those substrings without disturbing surrounding content. Uses a second BCV parser instance with `book_alone_strategy: 'ignore'` to avoid treating bare book mentions as jumpable references. When `currentBookOsis` is provided, it is prepended to the input so the parser can resolve bare `chapter:verse` citations (e.g. `"13:45"`) against the current book.

## Dependencies

- **External libraries:** `bible-passage-reference-parser` (CJS module, `bcv_parser`)

## Patterns / notes

- **Two parser instances:** A single shared `bcv` instance is used for all `toOsis` calls (safe because `.parse()` is stateless between calls). A separate `detectionBcv` instance is used for `findReferencesInText` with different options, so the two behaviors never interfere.
- **Verse-level precision forced:** The main parser is configured with `osis_compaction_strategy: 'bcv'` so every result is either a `Book.C.V` point or a `Book.C.V-Book.C.V` range — downstream code never needs to special-case whole-chapter or whole-book references.
- **Offset adjustment for book context:** When `currentBookOsis` is prepended as a hint, `findReferencesInText` subtracts the prefix length from all returned indices so they still point correctly into the original string.
- **HTML-safe:** `findReferencesInText` is used directly on HTML strings in `swordService.wrapVerseReferences`; callers filter returned matches against tag boundaries to avoid wrapping text inside existing HTML attributes.
