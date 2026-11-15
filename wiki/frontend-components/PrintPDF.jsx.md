# frontend/src/components/PrintPDF.jsx

## Purpose

React-PDF (`@react-pdf/renderer`) document component that renders a calendar PDF from a pre-assembled `docData` structure. Produces a cover page (optional) and one monthly calendar page per selected month. All styling uses `StyleSheet.create` with point units (1 in = 72 pt). Only PDF-native fonts are used: Helvetica, Helvetica-Bold, Times-Roman, Times-Italic, Courier.

## Props

| Prop | Type | Description |
|---|---|---|
| `docData` | object | Assembled by `buildPrintDocument` from `printUtils.js`; contains `pages`, `showCover`, cover fields, and `config` |

## State / key logic

**Page dimensions:**
- `PAGE_DIMS` — letter: 612×792 pt, A4: 595×842 pt (both portrait base; landscape swaps w/h).
- `makeStyles({ paper, orientation, margin, config })` builds a `StyleSheet` using the computed page dimensions, margin, and config typography settings.

**Cover page:**
- Rendered when `docData.showCover` is true.
- Dark navy background (`#1a1a2e`), optional full-bleed cover image with `#000/40` overlay.
- Large centered title, italic verse text, small reference text.

**Monthly page layout:**
- Header strip: optional background image with configurable overlay opacity; month title centered; optional verse image in a corner (corner position from `verseCorner` — top-right, top-left, bottom-right, bottom-left); verse text and reference overlaid on the verse image.
- `getHeaderHeight(hasVerse)` from `printUtils.js` determines header strip height: 48 pt flat header vs. `verseImageSize + padding * 2` (≈ 126 pt) when a verse image is present.
- Weekday header row: 7 columns of `DAY_LABELS` from `printUtils.js`, height from `LAYOUT.weekdayH`.
- Grid: 35 cells in a 7-column layout. Each cell height = `(pageH - margin*2 - headerHeight - weekdayRowH) / 5`.
- Day cells: day number top-left, entry titles (truncated, colored per-layer), optional Hebrew date bottom, optional background image with black/40 overlay.
- Overflow cells (when a 5-row grid needs to show days from both the last day and an overflow day) are split with a horizontal rule.

**`LAYOUT` constants** (from `printUtils.js`):
- `verseImageSize: 110` — verse image height in points.
- `headerPadding: 8` — padding inside header strip.
- `weekdayH: 20` — weekday header row height.
- `weekdayMargin: 1` — gap between weekday header and grid.
- `topStripMargin: 6` — gap below header strip.

## Dependencies

- `@react-pdf/renderer` — `Document`, `Page`, `View`, `Text`, `Image`, `StyleSheet`
- `printUtils` — `DAY_LABELS`, `LAYOUT`

## Notes

- All image data passed into `docData` must already be base64-encoded strings (not URLs). `PrintEditor` calls `urlToBase64` from `printUtils.js` to hydrate URLs before passing the doc to this component.
- Font family options in `config` are limited to PDF-native fonts (Helvetica, Times-Roman, Courier) plus any custom font registered via `@react-pdf/renderer`'s `Font.register`. The `PrintEditor` handles font registration.
- The component is stateless — it is purely a render function over `docData`.
