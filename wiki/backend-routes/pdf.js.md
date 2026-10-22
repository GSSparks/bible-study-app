# backend/src/routes/pdf.js

## Purpose

Manages the document library (PDFs, DOC, DOCX files). The library listing and file streaming are public so anonymous visitors can read documents. Uploading, metadata editing, deletion, and OCR are admin-only. Upload uses `requireAdmin` before multer parsing to reject non-admin requests before reading large file payloads. Documents are stored on disk; metadata and extracted text (capped at 200K characters) are kept in the `Document` Prisma model.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/pdf/search?q=<term>` | Full-text search across document title and extracted body text; returns matching document records |
| GET | `/api/pdf` | Lists all documents in the library |
| POST | `/api/pdf` | Uploads and ingests a new document; admin-only; multipart: field `file`, optional `title`, `author`, `collection`; accepts PDF/DOC/DOCX, max 100 MB |
| GET | `/api/pdf/:id` | Returns document metadata and extracted text for a specific document |
| PATCH | `/api/pdf/:id` | Updates document `title`, `author`, and/or `collection`; admin-only |
| DELETE | `/api/pdf/:id` | Deletes the document record and its file on disk; admin-only |
| POST | `/api/pdf/:id/ocr` | Runs OCR on an existing document (may take several minutes for large scanned PDFs); admin-only |
| GET | `/api/pdf/:id/file` | Streams the raw document file for viewing or download; public |

## Auth

- `GET /api/pdf`, `GET /api/pdf/:id`, `GET /api/pdf/:id/file`, and `GET /api/pdf/search` are public.
- `POST /api/pdf`, `PATCH /api/pdf/:id`, `DELETE /api/pdf/:id`, and `POST /api/pdf/:id/ocr` require `requireAdmin`.

## Dependencies

- `pdfService` — `ingestPdf`, `listDocuments`, `getDocumentFilePath`, `getDocument`, `searchDocuments`, `updateDocument`, `deleteDocument`, `ocrDocument`
- `multer` — in-memory file upload (max 100 MB; PDF/DOC/DOCX only)
- `node:fs` — streaming file for download
