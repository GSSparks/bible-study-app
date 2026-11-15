# frontend/src/components/PrintPreview.jsx

## Purpose

In-browser CSS/HTML rendering of the same calendar layout as `PrintPDF`, used as a live preview inside `PrintEditor`. Mirrors the PDF layout using HTML `div` elements with inline pixel dimensions (at 96 dpi). Renders a cover page and one monthly grid per selected month. Because it uses standard HTML rather than a PDF renderer, it can display images as `<img>` elements (no base64 hydration required), making it fast enough to update on every config change.

## Props

| Prop | Type | Description |
|---|---|---|
| `docData` | object | Same structure as `PrintPDF` receives: `pages`, `showCover`, cover fields, `config` |
| `availableFonts` | array | Uploaded custom font objects `{ family, url }` — injected via `<style>` `@font-face` rules |

## State / key logic

**Page dimensions:**
- `PAGE_DIMS_PX` — letter: 816×1056 px (8.5×11 in at 96 dpi), A4: 794×1123 px.
- Landscape swaps width and height.
- `margin` = `config.margin * 96` px (config stores inches).
- `PT = 96 / 72` — conversion factor used to scale point-based `LAYOUT` constants to pixels.

**Font registration:**
- `availableFonts` are injected as `@font-face` rules in a `<style>` tag at the top of the preview. This keeps custom font rendering consistent between preview and PDF.

**Cover page:**
- Same visual structure as `PrintPDF`: dark navy background, optional full-bleed cover image with black/40 overlay, centered title, verse text, verse reference.

**Monthly grids:**
- `pages` is an array of arrays (one sub-array per printed page, each containing one or more month data objects). Each month renders:
  - Header strip with optional background image, month title, optional verse image in a corner with verse text overlay.
  - Weekday header row (shown when `config.showWeekdayHeaders`).
  - 5×7 grid of day cells. Cell dimensions computed the same way as `PrintPDF` but in pixels.
  - Each cell shows: day number, entry titles (font family/size/color from config, capped at a few lines), optional Hebrew date.
  - Day background images rendered as `<img>` with `object-cover` and a dark overlay for legibility.

**Config flags honored:**
- `showDayImages` — toggles day background images.
- `showHebrewDates` — toggles Hebrew date text in cells.
- `showEntryTitles` — toggles entry title rendering in cells.
- `showWeekdayHeaders` — toggles the weekday header row.

## Dependencies

- `printUtils` — `DAY_LABELS`, `LAYOUT`

## Notes

- The preview is wrapped in a flex column container with `gap-6 py-4` so multiple pages stack vertically and can be scrolled in the `PrintEditor` right pane.
- Because this is a pure HTML rendering, it cannot perfectly replicate every aspect of the PDF (e.g., exact text wrapping at the PDF point level), but it is visually close enough for layout proofing.
- No state — purely a render function over `docData` and `availableFonts`.
