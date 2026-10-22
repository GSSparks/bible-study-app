# backend/src/services/ocrService.js

## Purpose

Provides OCR (optical character recognition) capability for scanned or image-only PDF files. It uses `pdftoppm` to render each page of a PDF to a PNG at 150 DPI, then runs `tesseract` on each page image. The extracted text is capped at 200,000 characters, matching the same cap used for regular text extraction in `pdfService`. This service is called by `pdfService` when a PDF's selectable text content is too sparse to be a real text-layer PDF.

## Key exports

- **`isOcrAvailable()`** — Runs `tesseract --version` and returns `true` if the command succeeds, `false` otherwise. Used to guard OCR attempts at call sites so a missing `tesseract` binary produces a warning rather than an error.
- **`ocrPdf(pdfPath)`** — Renders the PDF to per-page PNGs in a temporary directory using `pdftoppm`, runs `tesseract` on each page in English with `--psm 3` (automatic page segmentation), concatenates the results, and returns the text capped at 200,000 characters. Returns `null` if no pages were found. Always cleans up the temporary directory in the `finally` block.

## Dependencies

- **External binaries (system):** `tesseract` (Tesseract OCR engine), `pdftoppm` (part of poppler-utils)
- **Node built-ins:** `child_process.spawn`, `fs/promises`, `path`, `os`

## Patterns / notes

- **Spawn over exec:** Both `pdftoppm` and `tesseract` are run via `spawn` (wrapped in a Promise) rather than `exec`, avoiding shell injection risk and allowing stdout to be collected as a buffer without shell intermediary.
- **150 DPI rendering:** This is described in a comment as "a good balance of OCR accuracy vs speed" — higher DPI improves recognition but increases processing time.
- **Temporary directory lifecycle:** `os.tmpdir()` + `mkdtemp` creates an isolated temp dir; `fs.rm` with `{ recursive: true, force: true }` in `finally` ensures cleanup even on failure.
- **Text cap consistency:** The 200,000-character cap matches the cap in `pdfService.ingestPdf`, ensuring OCR-sourced text is treated identically to natively extracted text from the application's perspective.
