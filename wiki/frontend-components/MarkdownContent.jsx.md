# frontend/src/components/MarkdownContent.jsx

## Purpose

Thin wrapper around `react-markdown` with the `remarkGfm` plugin for GitHub-Flavored Markdown support (tables, task lists, strikethrough, autolinks). Applies the `markdown-body` CSS class for consistent styled rendering. Used throughout the app wherever markdown content — such as lesson descriptions, study resource notes, or rich text fields — needs to be displayed as formatted HTML.

## Props

| Prop | Type | Description |
|---|---|---|
| `children` | string | Markdown source text to render |
| `className` | string | Additional CSS classes appended after `markdown-body` (default `''`) |

## State / key logic

None. Purely a presentational wrapper.

## Dependencies

- `react-markdown` — core markdown-to-JSX renderer
- `remark-gfm` — GitHub Flavored Markdown plugin (tables, strikethrough, task lists, autolinks)

## Notes

- The `markdown-body` class is defined in the global stylesheet (`index.css`) and provides GitHub-style typography (heading sizes, `<code>` blocks, tables, blockquotes, etc.).
- `className` is appended with `trim()` to avoid a trailing space when `className` is empty.
- Because it uses `react-markdown` (not `dangerouslySetInnerHTML`), HTML injection from untrusted markdown is safe by default — raw HTML tags in the source are escaped unless `rehype-raw` is explicitly added.
