# backend/src/services/pdfService.js

## Purpose

Manages the document library — ingesting uploaded PDF, DOCX, and legacy DOC files, storing them on disk, extracting their text for full-text search, and persisting metadata in the `Document` table. For scanned PDFs where text extraction yields too little selectable text, it automatically attempts OCR via `ocrService`. It also handles listing, retrieval, metadata updates, deletion, and search across the library.

## Key exports

- **`ingestPdf({ buffer, originalName, title, author, collection })`** — Saves the file to `PDF_STORAGE_PATH`, extracts text based on file type (DOCX via `mammoth`, DOC via `antiword`, PDF via `pdf-parse`), runs OCR if the PDF appears to be image-only (fewer printable characters than `max(100, pageCount * 100)`), and creates a `Document` record. Text is capped at 200,000 characters.
- **`listDocuments()`** — Returns all documents ordered by creation date, excluding `extractedText` from the select (that field is large and not needed for list views).
- **`getDocumentFilePath(id)`** — Returns the absolute filesystem path for a document's stored file, or `null` if not found.
- **`getDocument(id)`** — Returns the full document record including `extractedText`.
- **`updateDocument(id, { title, author, collection })`** — Updates document metadata. When `title` is changed, also updates any `StudyResource` rows whose `url` points to this document's file endpoint, keeping labels in sync.
- **`deleteDocument(id)`** — Removes any `StudyResource` rows referencing the document, deletes the file from disk (with a warning on failure rather than an error), and deletes the `Document` record.
- **`ocrDocument(id)`** — Re-runs OCR on an already-ingested document and updates its `extractedText`. Throws if OCR produces no text.
- **`searchDocuments(term)`** — Case-insensitive (`ILIKE`) search against `title` and `extractedText`, returning up to 25 results.

## Dependencies

- **Prisma models:** `Document`, `StudyResource`
- **External libraries:** `pdf-parse`, `mammoth` (DOCX), `node:child_process` (`execFile` for `antiword`)
- **Other services:** `ocrService.js` (`isOcrAvailable`, `ocrPdf`), `config.js` (`pdfStoragePath`)
- **Node built-ins:** `fs/promises`, `path`, `os`, `util`

## Patterns / notes

- **Multi-format support:** PDF, DOCX, and legacy `.doc` are each handled with a dedicated extraction path. The OCR fallback is PDF-only (scanned Word documents are not a common case).
- **Image-PDF detection heuristic:** If printable (non-whitespace) characters in the extracted text are fewer than `max(100, pageCount * 100)`, the PDF is treated as likely image-only and OCR is attempted — a practical heuristic that avoids running OCR on every PDF.
- **Safe filename generation:** Uploaded filenames are sanitized with a character allowlist before being stored on disk.
- **Cascade-aware deletion:** `deleteDocument` manually removes `StudyResource` rows before deleting the `Document` record, since the foreign key relationship may not cascade automatically.
- **Known limitation:** Search uses basic `ILIKE`; the codebase comment notes this should be upgraded to PostgreSQL full-text search (`tsvector` + GIN index) once the library grows.
