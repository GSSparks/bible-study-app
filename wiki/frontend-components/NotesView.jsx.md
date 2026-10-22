# frontend/src/components/NotesView.jsx

## Purpose

Notes management view (always-mounted in `AppShell`). Provides a searchable, filterable list of all user notes in a left sidebar and a reading/editing panel on the right. Supports Markdown editing, full-text search, export, and inline Markdown rendering.

## Props

| Prop | Type | Description |
|---|---|---|
| `isActive` | boolean | CSS visibility toggle (always-mounted pattern) |
| `auth` | object | `{ user, isLoggedIn }` |
| `initialNoteId` | string \| null | Note ID to open on mount (deep-link support) |

## State / key logic

**Sidebar:**
- Filter tabs: All / Bible / AI / Personal — maps to tag-based API filter parameters.
- Search input with 300ms debounce → calls `api.listNotes({ q, tag })`.
- Note list renders title + date + reference snippet.
- Book-highlight notes (`tags.includes('book-highlight')`) and empty PDF-highlight notes are filtered out of the list (these are internal annotation records, not user-facing notes).

**Right pane — two sub-modes:**
- `NoteViewer` — Markdown rendered with `RichContent` component (handles internal links, verse refs, etc.). Shows reference, tags, and a toolbar with Edit / Delete buttons.
- `NoteEditorPanel` — slide-in right panel (`z-50`), full-width on mobile. Uses `@uiw/react-md-editor` (`MDEditor`). Auto-saves on blur. Fields: title, body (MDEditor), reference, module, tags.

**Export:**
- "Export all notes" button downloads a `.md` blob. Assembles all notes into a single Markdown document with `## Title` headings and frontmatter-style metadata.

**New note creation:**
- "+" button creates a blank note via `api.createNote` and immediately opens `NoteEditorPanel`.

**Deletion:**
- Confirmation prompt (inline, not a modal). Calls `api.deleteNote(id)`, then deselects.

## Dependencies

- `api` (`../api/client.js`) — `listNotes`, `createNote`, `updateNote`, `deleteNote`.
- `RichContent` — Markdown render component with internal link handling.
- `@uiw/react-md-editor` (`MDEditor`) — Markdown editor with preview toggle.

## Notes

- Always-mounted: switching away from Notes view preserves the selected note, scroll position, and any unsaved draft.
- The `NoteEditorPanel` is a slide-in rather than a page replacement, so the note list remains visible on desktop.
- `fromAssistant: true` notes (created by StudyAssistant's "save as note") appear in the AI filter tab.
- The `initialNoteId` prop supports deep linking from other views (e.g. clicking a note reference in a Scriptorium post).
