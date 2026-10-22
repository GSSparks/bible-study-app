# frontend/src/components/NotesSidebar.jsx

## Purpose

A full-featured notes panel used in the Cell's Notes pane. Shows two tabs: "This passage" (notes anchored to the current reference) and "All notes" (searchable list). Supports inline create, inline edit (using `MDEditor`), delete, and viewing notes in a full-screen modal (`NoteModal`). Renders note previews using `react-markdown`.

## Props

| Prop | Type | Description |
|---|---|---|
| `reference` | string | Current Bible reference; drives the "This passage" tab |
| `module` | string | Current module; stored on newly created passage notes |
| `isLoggedIn` | bool | Shows sign-in prompt when false |

## State / Key Logic

- `tab` — `'passage'` or `'all'`. Defaults to `'passage'` when a reference is provided.
- `notes` — fetched via `api.listNotes({ reference })` for passage tab, `api.listNotes({ q: query })` for all tab. Debounced 200 ms on `query` change.
- `editingId` — `'new'` or an existing note ID. Shows the inline `MDEditor` form.
- `viewingNote` — set on card click; renders `NoteModal`.
- `save`: For new notes in passage tab, attaches `reference` and `module`. For edits, patches `title` and `body` only.
- `stripLeadingHeading` strips a leading `# Title` line from the body to prevent duplicate rendering when AI-generated notes include the title as both field and first Markdown heading.
- `cleanTitle` strips `#` prefix from titles that were stored with Markdown heading syntax.
- `NoteModal` (internal): full-screen modal with Markdown rendering, edit/delete buttons, and Escape-to-close.

## Dependencies

- `api.listNotes`, `api.createNote`, `api.updateNote`, `api.deleteNote`
- `MDEditor` from `@uiw/react-md-editor`
- `Markdown` from `react-markdown`, `remark-gfm`

## Notes

- Cards are click-to-view, double-click-to-edit for discoverability.
- `data-color-mode="dark"` on the outer div sets MDEditor's theme. The NoteModal uses `data-color-mode="light"` for parchment-background rendering.
- `fromAssistant` flag is shown in the card subtitle when present.
