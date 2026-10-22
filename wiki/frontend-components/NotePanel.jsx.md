# frontend/src/components/NotePanel.jsx

## Purpose

A slide-in right-side panel (always mounted, CSS toggled) for quick note creation from anywhere in the app. Uses `@uiw/react-md-editor` for a full Markdown editor with preview. Saved notes are freestanding (no reference anchor). Provides a link to navigate to the full Notes view.

## Props

| Prop | Type | Description |
|---|---|---|
| `open` | bool | Controls slide-in/out via CSS transform |
| `onClose` | func | Close the panel |
| `isLoggedIn` | bool | Hides editor and shows sign-in prompt when false |
| `onOpenInNotes` | func | Navigates to the Notes view and closes this panel |

## State / Key Logic

- `title`, `body` — controlled inputs. Cleared after successful save. `savedId` tracks the last-saved note ID for the "Saved! view in Notes →" confirmation message.
- On `open` change to `true`, focuses the title input after 300 ms (allows CSS transition to complete).
- `handleSave` calls `api.createNote({ title, body })`. Title is optional (passed as `null` if blank).
- Always-mounted pattern: `translate-x-0` / `translate-x-full` CSS transitions. The backdrop is a semi-transparent overlay also CSS-toggled.

## Dependencies

- `api.createNote`
- `MDEditor` from `@uiw/react-md-editor`

## Notes

- This panel creates freestanding notes only (no `reference` or `module`). For verse-anchored note creation, `VerseCommentaryEditor` and `SelectionNotePopup` are used.
- `MDEditor` is shown in `preview="edit"` mode (edit pane only, not split preview) to maximize writing space.
