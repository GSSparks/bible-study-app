# frontend/src/components/ScriptoriumStudiesTab.jsx

## Purpose

Study card grid tab rendered inside `ScriptoriumDetail`'s Studies tab. Lists all studies in a given Scriptorium, allows members to create new studies or import studies from a JSON export file. Clicking a study card opens the study reader or builder.

## Props

| Prop | Type | Description |
|---|---|---|
| `scriptoriumId` | string | ID of the parent Scriptorium |
| `isMember` | boolean | Whether the current user is a member (controls create/import button visibility) |
| `onOpenStudy` | function | Called with `studyId` to navigate to `StudyDetail` |
| `onOpenBuilder` | function \| undefined | Called with `studyId` to navigate to `StudyBuilder`; if not provided, falls back to `onOpenStudy` |

## State / key logic

**Study list:**
- Fetched via `api.listScriptoriumStudies(scriptoriumId)` on mount and after any create/import.
- `loading` and `error` state for fetch lifecycle.
- `refresh()` helper re-fetches the list.

**Study cards (grid layout: 1 col on mobile, 2 on sm, 3 on lg):**
- Each card has a banner image (`s.bannerUrl`) or a generative gradient fallback using `getAvatarColor(s.title)` to produce two radial gradient blobs.
- Card layout: banner image area (h-24) with gradient overlay → title → description (line-clamped to 2 lines).
- Clicking the banner or the title/description area calls `onOpenStudy(s.id)`.

**Create new study:**
- Visible to members only.
- "+" button opens `CreateStudyModal`.
- `CreateStudyModal` (defined in the same file): fields for title (required) and description (optional, via `RichEditor`). Submits via `api.createStudy({ title, description, scriptoriumId })`. On success, calls `onCreated(id)` which refreshes the list and navigates to the builder via `onOpenBuilder(id)` (or `onOpenStudy(id)` if builder is not provided).

**Import study from JSON:**
- Visible to members only.
- `<label>` wrapping a hidden `<input type="file" accept=".json">`.
- `handleImportFile`: reads the file as text, JSON-parses it, calls `api.importStudy(scriptoriumId, data)`. On success, refreshes list and navigates to the imported study via `onOpenStudy(created.id)`.
- `importing` boolean disables the import label during the async operation.

## Dependencies

- `api` (`../api/client.js`) — `listScriptoriumStudies`, `createStudy`, `importStudy`.
- `RichEditor` — used inside `CreateStudyModal` for the description field.
- `getAvatarColor` (`../utils/avatar.js`) — generates a consistent color from a study title string for the banner gradient fallback.
- `Upload` icon from `lucide-react`.

## Notes

- This component is a sub-component of `ScriptoriumsView` / `ScriptoriumDetail`, rendered only in the Studies tab.
- The banner gradient fallback (`radial-gradient` blobs using `getAvatarColor`) matches the aesthetic used elsewhere for content without custom images (e.g. Scriptorium member avatars).
- JSON import/export enables sharing studies between Scriptorium instances or backing up study content.
- `CreateStudyModal` is defined in the same file (not a separate import), keeping the create-study UX co-located with the tab that shows studies.
