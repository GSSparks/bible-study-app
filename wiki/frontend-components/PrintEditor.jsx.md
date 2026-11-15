# frontend/src/components/PrintEditor.jsx

## Purpose

Full-screen modal for configuring and exporting calendar PDFs. Presents a split-panel UI: a left scrollable config form and a right live preview (`PrintPreview`). The user selects months, paper size, orientation, margins, fonts, colors, layer visibility, and per-month settings (header image, verse image, verse text/reference, verse corner position). A "Download PDF" button generates the PDF via `@react-pdf/renderer` (`PrintPDF`) and triggers a browser download.

## Props

| Prop | Type | Description |
|---|---|---|
| `year` | number | Calendar year to pre-select |
| `calSystem` | string | `'gregorian'` / `'julian'` / `'hebrew'` |
| `hebYear` | number | Hebrew year (used when `calSystem === 'hebrew'`) |
| `layers` | array | All calendar layers (pre-filters to visible layers for `layerIds`) |
| `month` | number | Current month — pre-selected in `selectedMonths` |
| `onClose` | function | Called to close the modal |

## State / key logic

**Config state (`config`):**
- `layout` — `'single-month'` (currently the only layout).
- `paper` — `'letter'` or `'a4'`.
- `orientation` — `'landscape'` or `'portrait'`.
- `margin` — inches (default 0.5).
- `layerIds` — which layers to include.
- Typography: `fontFamily`, `titleFontFamily`, `verseTextFontFamily`, `verseRefFontFamily`, `fontSize`, `titleFontSize`, `fontColor`, `titleColor`, `verseTextFontSize`, `verseTextColor`, `verseRefFontSize`, `verseRefColor`.
- `overlayOpacity`, `verseFillHeight` — header image overlay settings.
- `layerFontSizes`, `layerFontColors` — per-layer overrides.
- `monthSettings` — per-month object keyed by month number string: `{ headerBgImageUrl, verseImageUrl, verseRef, verseText, verseCorner }`.
- Cover settings: `coverTitle`, `coverVerseRef`, `coverVerseText`, `coverImageUrl`.
- `customFontSrc`, `customFontFamily` — optional uploaded custom font.

**Data loading:**
- Loads available fonts (`api.listFonts`), installed Bible modules (for cover verse fetch), and saved print config (`api.getPrintConfig(year)`) on mount.
- Fetches calendar entries, Hebrew dates, and day images for all `selectedMonths` in sequence; stores them in `entriesByMonth`, `hebrewDatesByMonth`, `dayImagesByMonth` keyed `YYYY-M`.

**Image hydration:**
- Before PDF generation, `urlToBase64` (from `printUtils.js`) converts all image URLs (header backgrounds, verse images, day cell images, cover image) to base64 strings, because `@react-pdf/renderer` cannot fetch URLs in the browser PDF worker.
- The `imageCache` ref avoids redundant fetches across preview refreshes.

**PDF generation (`handleGenerate`):**
- Calls `buildPrintDocument` (from `printUtils.js`) to assemble the full document data structure.
- Hydrates images to base64.
- Calls `pdf(<PrintPDF docData={...} />).toBlob()` to generate the PDF blob.
- Creates a temporary `<a>` element and triggers a download.

**Preview:**
- `PrintPreview` is rendered live in the right pane using the same `docData` structure (without base64 hydration — it uses URLs directly for speed).
- The preview auto-updates when `config`, `selectedMonths`, or fetched data changes via a `useMemo` on `docData`.

**Font options:**
- `FONT_OPTIONS` constant offers Helvetica, Times, and Courier (PDF-native fonts).
- Uploaded fonts appear in a separate dropdown and are injected via `@font-face` in `PrintPreview`.

## Dependencies

- `printUtils` — `buildPrintDocument`, `getHebMonthName`, `MONTH_NAMES`, `urlToBase64`
- `PrintPreview` — live in-browser preview
- `PrintPDF` — `@react-pdf/renderer` document component for actual PDF
- `@react-pdf/renderer` (`pdf`) — PDF blob generation
- `@hebcal/core` (`HDate`) — Hebrew month name computation
- `api` — `listCalendarEntries`, `listDayImages`, `listFonts`, `listInstalledModules`, `getPrintConfig`, `savePrintConfig`, `uploadCalendarImage`, `fetchVerse`
- `resizeImage` (`../utils/imageUtils`) — image resize before header/verse image upload

## Notes

- Config is auto-saved to the server via `api.savePrintConfig(year, config)` when the user changes settings (debounced or on specific actions).
- `DEFAULT_MONTH_SETTING` defines the empty per-month settings structure used when a month has no saved settings.
- The modal traps interaction — it covers the full viewport with a dark overlay and an X close button.
- Font upload: a custom TTF/OTF file can be uploaded via `api.uploadFont`; the resulting font family is registered in both the preview (via `<style>` injection) and the PDF renderer.
