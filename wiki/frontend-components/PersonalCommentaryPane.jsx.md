---
name: PersonalCommentaryPane
description: Dedicated workspace pane for reading and writing personal Bible commentary (the "My Studies" module), with import/export and an all-entries browser.
type: reference
---

# frontend/src/components/PersonalCommentaryPane.jsx

## Purpose

A workspace pane (type `personal_commentary`) that surfaces the user's personal commentary ("My Studies") as a first-class study tool. It shows the entry for the current focused passage, provides an embedded Markdown editor to write or update it, lists every entry the user has written, and supports full import/export via Markdown files.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `reference` | `string` | The currently focused Bible passage reference (e.g. `"John 3:16"`). Updated by the workspace as the user navigates. |
| `onNavigate` | `fn(ref)` | Called when the user clicks an entry in the all-entries list; navigates the workspace to that reference. |

## State / key logic

**Entry for current reference:**
- Fetches `api.getCommentaryEntry(reference)` on `reference` change.
- Resets editing state when the reference changes.

**Editing:**
- `editing` boolean toggles between a read view (rendered Markdown) and an inline editor.
- Editor: title input + write/preview tabs + textarea with Cmd+Enter shortcut; saves via `api.saveCommentaryNote`.
- After save: re-fetches the entry and calls `refreshAll()` to keep the sidebar list in sync.

**All entries list:**
- Fetched once on mount via `api.listAllCommentaryEntries()`; refreshed after every save or import.
- Entries are ordered by reference (alphabetical). Clicking an entry calls `onNavigate(ref)`.
- The currently focused entry is highlighted.

**Export:**
- `api.exportCommentary()` → Blob download of `my-commentary.md`.
- Format: one `## Reference (— Title)?` section per entry, separated by `---`.

**Import:**
- File input accepting `.md`; calls `api.importCommentary(file)`.
- Import endpoint upserts entries — existing entries for the same reference are updated, not duplicated.
- Shows a count toast (`"Imported N entries."`).

## Dependencies

- `api` (`../api/client.js`) — `getCommentaryEntry`, `saveCommentaryNote`, `listAllCommentaryEntries`, `exportCommentary`, `importCommentary`
- `ReactMarkdown` + `remark-gfm` — entry preview rendering

## Notes

- Registered as pane type `personal_commentary` in `useWorkspaceLayout.js` and handled in `WorkspaceLayout.jsx`.
- This pane requires login; all API calls are auth-gated on the backend.
