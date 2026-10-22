# frontend/src/components/RichContent.jsx

## Purpose

A Markdown rendering component with optional verse-reference enrichment. Renders Markdown using `MDEditor.Markdown` (which supports GFM via the `rehypeVerseRefs` rehype plugin when enabled). When `bibleModule` is provided, inline verse references (`.verse-ref` spans injected by `rehypeVerseRefs`) display a `VerseHoverCard` on mouseover and trigger `onNavigate`/`onVerseClick` on click. Used for rich post/comment bodies, note previews, and study content wherever Markdown with live verse links is needed.

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | string | Markdown source text |
| `className` | string | Class applied to the wrapper div |
| `colorMode` | string | `'dark'` or `'light'` for MDEditor theme; default `'dark'` |
| `onVerseClick` | func | `(ref) => void` — called when a `.verse-ref` span is clicked |
| `onNavigate` | func | `(ref) => void` — passed to VerseHoverCard's "Open in Cell" link |
| `bibleModule` | string | If provided, enables hover cards (fetches preview text from this module) |

## State / Key Logic

- `hovered` — `{ ref, rect }` — managed with 150 ms debounced close timer.
- `wantRefs = Boolean(onVerseClick || bibleModule)` — controls whether `rehypeVerseRefs` is included. When false, rehype plugin is skipped (avoids DOM manipulation overhead when verse links are not needed).
- Returns `null` when `children` is falsy or whitespace.

## Dependencies

- `MDEditor.Markdown` from `@uiw/react-md-editor`
- `VerseHoverCard`
- `rehypeVerseRefs` from `utils/rehypeVerseRefs.js`

## Notes

- `data-color-mode` is set on the wrapping div to control MDEditor's CSS theme variables.
- `onNavigate ?? onVerseClick` is passed to VerseHoverCard so a single callback can serve both purposes when only one is provided.
