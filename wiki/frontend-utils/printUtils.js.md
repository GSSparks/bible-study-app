# frontend/src/utils/printUtils.js

## Purpose

Shared utilities for the calendar print/PDF pipeline. Contains display label arrays, layout constants, calendar grid helpers, and the two main data-assembly functions used by both `PrintEditor` and `PrintPDF`/`PrintPreview`.

## Key exports

**Display labels:**
- `MONTH_NAMES` — 12 Gregorian month name strings.
- `HEB_MONTH_NAMES` — 12 Hebrew month name strings (non-leap year).
- `DAY_LABELS` — `['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']`.

**Hebrew helpers:**
- `getHebMonthName(month, hebYear)` — Returns the display name for a Hebrew month number. Uses `HDate.isLeapYear()` to choose between `HEB_MONTH_NAMES` (12 entries) and `HEB_MONTH_NAMES_LEAP` (13 entries, with Adar I and Adar II). Month is 1-indexed.

**Layout constants (`LAYOUT`):**
- `verseImageSize: 110` — verse image height in points.
- `headerPadding: 8` — padding inside header strip in points.
- `weekdayH: 20` — weekday header row height in points.
- `weekdayMargin: 1` — gap between weekday header and grid in points.
- `topStripMargin: 6` — gap below header strip in points.

**`getHeaderHeight(hasVerse)`** — Returns header height in points: `verseImageSize + headerPadding * 2` (≈ 126 pt) when `hasVerse` is true, or 48 pt otherwise.

**Grid helpers:**
- `getGridInfo(system, year, month, hebYear)` — Returns `{ firstDay, daysInMonth }` for any calendar system. `firstDay` is the 0-indexed day of week (0 = Sunday) of the 1st of the month. For Hebrew, uses `HDate(1, month, hebYear).daysInMonth()`.
- `getDisplayDay(entry, system, year, month, hebYear)` — Converts a stored Gregorian entry date to the display-system day number. Returns `null` if the entry falls outside the currently viewed month. Julian: shifts by -13 days. Hebrew: uses `HDate` to find the Hebrew date and checks year+month match.
- `getOverlappingGregorianMonths(start, end)` — Returns `[{ year, month }]` for each Gregorian month that overlaps the date range `[start, end]`, inclusive.

**Image hydration:**
- `urlToBase64(url)` — Fetches an image URL via `fetch`, converts the response blob to a base64 string using `FileReader`, and strips the `data:...;base64,` prefix. Returns the raw base64 string. Used by `PrintEditor` before passing data to `PrintPDF`.

**Data assembly:**
- `buildPrintData({ calSystem, year, month, hebYear, config, layers, entries, hebrewDates, dayImages })` — Builds the data structure for a single calendar month:
  - Filters layers by `config.layerIds`.
  - Groups entries by display day (using `getDisplayDay`), skipping entries not visible in the current month view.
  - Builds a 35-cell array: active day cells have `{ day, entries, hebrewDate, image, isOverflow }`, empty cells have `day: null`.
  - Computes `monthTitle` from the calendar system and year/month/hebYear.
  - Reads per-month settings from `config.monthSettings[String(month)]` for header image, verse image, verse text, verse corner.
  - Calls `getHeaderHeight(hasVerse)` to compute `headerHeight`.
  - Returns the full month data object including `cells`, `monthTitle`, header config, verse config, `weekdayHeaders`, `activeLayers`, and pass-through config/system fields.

- `buildPrintDocument({ calSystem, year, hebYear, config, layers, entriesByMonth, hebrewDatesByMonth, dayImagesByMonth, coverImageUrl, selectedMonths })` — Assembles the full multi-month print document:
  - Maps `selectedMonths` to `buildPrintData` calls.
  - Wraps each month as a single-element array (one month per page).
  - Returns `{ pages, showCover, coverTitle, coverVerseRef, coverVerseText, coverImageUrl, config }`.

## Dependencies

- `@hebcal/core` (`HDate`) — Hebrew calendar arithmetic for `getHebMonthName`, `getGridInfo`, `getDisplayDay`

## Notes

- `CalendarTab.jsx` has local copies of `getGridInfo` and `getDisplayDay` that implement the same logic; `printUtils.js` is the canonical shared version used by the print pipeline.
- `buildPrintDocument` currently creates one page per month (single-month layout). Multi-month-per-page layouts could be supported by grouping `monthData` differently before assignment to `pages`.
- `urlToBase64` strips the `data:...;base64,` prefix because `@react-pdf/renderer` expects the raw base64 string, not a data URL.
