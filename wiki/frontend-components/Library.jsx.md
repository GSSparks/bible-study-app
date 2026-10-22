# frontend/src/components/Library.jsx

## Purpose

A minimal PDF upload and listing component. Fetches the user's document list on mount, displays each document as a link that opens the file directly in a new tab, and provides a file input to upload new PDFs. This is a simpler, standalone alternative to `DocumentPane`; it lacks search, renaming, OCR, and the full `DocumentReader` experience.

## Props

None. Self-contained.

## State / Key Logic

- `docs` — fetched from `api.listDocuments()` on mount and after each successful upload.
- `uploading` — boolean that disables the upload input and shows "uploading…" label text while a `POST /api/pdf` request is in flight.
- `error` — displays any fetch or upload error inline.
- Upload uses a raw `fetch` with `FormData`; the `title` field is pre-populated from the filename with the `.pdf` extension stripped.
- `e.target.value` is reset after upload (success or failure) so the same file can be re-submitted.
- Document links use `api.documentFileUrl(d.id)` and open in a new tab (`target="_blank"`).

## Dependencies

- `api.listDocuments`, `api.documentFileUrl`
- `fetch /api/pdf` (direct)

## Notes

- This component predates `DocumentPane` and `DocumentReader`. It is kept as a lightweight fallback or embedded widget for contexts that do not need full document reading functionality.
- There is no delete action; management of uploaded documents is done elsewhere (e.g., `DocumentReader`'s delete button).
