# frontend/src/components/CellNotePane.jsx

## Purpose

A workspace pane (type `notes`) with a full MDEditor and a **Notes / Passage mode toggle**. In **Notes** mode it shows freestanding notes (no reference); in **Passage** mode it shows personal commentary notes (tagged `personal-commentary`, same data as `PersonalCommentaryPane`). A searchable dropdown picker lets the user find and load any note into the editor.

## Props

| Prop | Type | Description |
|---|---|---|
| `isLoggedIn` | bool | When false, skips all API calls |
| `focusedReference` | string | Workspace passage; in Passage mode, auto-selects the matching note when it changes |

## State / Key Logic

**Mode toggle** (`notes` | `passage`):
- Switching modes calls `handleModeSwitch`, which flushes any pending save then auto-selects: Passage → note matching `focusedReference` (or clears); Notes → most-recent general note.

**Searchable note picker** (dropdown with inline search input):
- On mount, loads all notes via `api.listNotes()` and splits client-side: freestanding → `generalNotes`, `personal-commentary`-tagged → `passageNotes`.
- `filteredNotes` is the active list filtered by `search` against reference, title, and body.
- Click-outside closes the dropdown.

**Auto-select in Passage mode**: when `focusedReference` changes and there are no unsaved changes (`dirtyRef.current === false`), the pane finds and loads the matching passage note automatically.

**Autosave**: edits debounce to `api.updateNote` after 2 s. `dirtyRef` + `selectedIdRef` + `titleRef` + `bodyRef` ensure the unmount-cleanup flush reads current values without stale closures.

**Create**: in Passage mode creates a Note with `{ reference, tags: ['personal-commentary'] }`; if one already exists for the current reference, selects it instead. In Notes mode creates a freestanding Note.

## Dependencies

- `@uiw/react-md-editor` — the Markdown editor
- `api.listNotes`, `api.createNote`, `api.updateNote`, `api.deleteNote`

## Notes

- Passage note data is stored as `Note` records with `tags: ['personal-commentary']`. The same records appear in `PersonalCommentaryPane` and `NotesView`.
