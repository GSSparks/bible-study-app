# frontend/src/components/CellNotePane.jsx

## Purpose

A full-featured Markdown note editor mounted as a workspace pane (type `notes`) inside `WorkspaceLayout`. Gives users a scratchpad for free-form study notes alongside their Bible/commentary/dictionary panes. Notes are stored as `Note` records via the standard notes API (freestanding, not anchored to a verse reference).

## Props

| Prop | Type | Description |
|---|---|---|
| `isLoggedIn` | bool | When false, the pane renders but skips all API calls |

## State / Key Logic

- **Note list**: loaded on mount via `api.listNotes({ freestanding: true })`; the first note in the list is auto-selected. The list is sorted by `updatedAt` descending so the most recently edited note appears first.
- **Autosave**: every edit to the title or body calls `scheduleSave`, which debounces to `api.updateNote` after 2 seconds (`DEBOUNCE_MS`). A `dirtyRef` tracks whether unsaved changes exist so that:
  - switching notes flushes the current note synchronously before loading the next,
  - unmounting the pane fires a final save (via the effect cleanup) to avoid losing in-flight edits.
- **Manual save**: the Save button calls `doSave` immediately, cancelling any pending debounce timer.
- **Note list overlay**: a slide-in left panel (z-indexed above the editor) shows all notes with title, body preview, and a delete button. Opening the list refreshes from the API.
- **Export**: downloads the current note body as a `.md` file using a `Blob` URL.
- **Create / Delete**: `api.createNote` with a blank body; `api.deleteNote` with optimistic list removal.

## Dependencies

- `@uiw/react-md-editor` — the Markdown editor component (imports its own CSS)
- `api.listNotes`, `api.createNote`, `api.updateNote`, `api.deleteNote`

## Notes

- Title and body are kept in both React state (for rendering) and `useRef` values (`titleRef`, `bodyRef`) so the unmount cleanup can safely read the latest values without stale closure issues.
- The `notes` pane type was added to `PANE_TYPES` in `useWorkspaceLayout.js` and to the mobile tab strip alongside the other eight pane types.
- No `reference` or `module` props — this pane deliberately ignores the workspace's focused reference. Notes are freestanding.
