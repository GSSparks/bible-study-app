# frontend/src/components/RefNav.jsx

## Purpose

A compact three-part navigation widget rendered in the Cell window header bar: `[Book name] [Chapter] : [Verse]`. Each segment is an independent clickable trigger — the book name opens `BookChapterPicker` (full two-step browse), the chapter number opens a `ChapterPopup` (compact grid for all chapters of the current book), and the verse number opens a `VersePopup` (stepper +/- input). Designed to replace a plain text input while keeping navigation discoverable and touch-friendly.

## Props

| Prop | Type | Description |
|---|---|---|
| `reference` | string | Current reference string to parse and display |
| `onNavigate` | func | `(ref) => void` — called with the new reference on any navigation |

## State / Key Logic

- `parseRef` parses `reference` into `{ bookStr, chapter, verse }` using a regex supporting `Book Ch:v`, `Book.Ch.v`, etc.
- `resolveBook` looks the book up in `BIBLE_BOOKS` by OSIS code or full name.
- If parsing fails or the book is not found, renders a plain `<span>` fallback.
- Three separate open states: `bookPickerPos` (position object), `chapterOpen`, `verseOpen`. `closeAll()` resets all three.
- `ChapterPopup` (internal): portal card with a 7-column grid of chapter buttons. Highlights `currentChapter`.
- `VersePopup` (internal): portal card with a number input, ‹ › step buttons, and a Go button. Calls `onNavigate` on Enter or Go.

## Dependencies

- `BookChapterPicker`
- `BIBLE_BOOKS` from `utils/bibleBooks.js`
- `createPortal`

## Notes

- `ChapterPopup` and `VersePopup` are defined inline (not exported) — they only exist to serve `RefNav`.
- The three-part split means the user always knows what they're clicking on and which level of granularity they're changing, without needing a text input focus+type+parse cycle.
