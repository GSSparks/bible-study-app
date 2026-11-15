# frontend/src/utils/imageUtils.js

## Purpose

Client-side image resize utility. Resizes an image file before upload so that neither dimension exceeds a configurable maximum, reducing bandwidth and server storage costs while preserving visual quality.

## Key exports

- **`resizeImage(file, maxSize = 1200)`** — Async function. Returns a new `File` object (or the original unchanged if already within bounds).
  - Skips non-image files (checked via `file.type.startsWith('image/')`).
  - Uses `createImageBitmap(file)` to decode the image without creating a DOM element.
  - If both dimensions are ≤ `maxSize`, closes the bitmap and returns the original `File` immediately.
  - Computes the scale factor as `Math.min(maxSize / width, maxSize / height)` to preserve the aspect ratio.
  - Draws to an offscreen `<canvas>` with `imageSmoothingQuality = 'high'`.
  - Format selection: PNG input → PNG output (preserves transparency); all other formats → JPEG at quality 0.85.
  - File extension is updated to match the output format (`.png` or `.jpg`).
  - Returns a new `File` with `lastModified: Date.now()`.

## Dependencies

- Browser APIs: `createImageBitmap`, `HTMLCanvasElement`, `CanvasRenderingContext2D`, `File`, `Blob`

## Notes

- Used in `CalendarTab.jsx` before calling `api.uploadCalendarImage`, and in `DayImagePicker` before uploading a day background.
- The 1200 px default is a reasonable upper bound for calendar backgrounds; callers can pass a different `maxSize` if needed.
- `createImageBitmap` is not available in all older browsers, but is well-supported in all modern ones.
