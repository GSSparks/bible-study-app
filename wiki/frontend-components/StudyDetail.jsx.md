# frontend/src/components/StudyDetail.jsx

## Purpose

Study lesson reader used within `ScriptoriumsView`. Renders a structured multi-lesson study: left sidebar with lesson list and per-lesson progress, and a main pane with lesson content, discussion, participant list, and resource footer. Used for viewing (not editing) a study — editing is done in `StudyBuilder`.

## Props

| Prop | Type | Description |
|---|---|---|
| `studyId` | string | ID of the study to load |
| `auth` | object | `{ user, isLoggedIn }` |
| `onBack` | function | Returns to the parent Scriptorium view |
| `onOpenBuilder` | function | Navigates to `StudyBuilder` for this study (for owners/admins) |
| `onOpenReference` | function | Called when a verse reference in the lesson is clicked |

## State / key logic

**Data loading:**
- `api.getStudy(studyId)` — loads `{ title, description, lessons, participants }`.
- `api.getStudyProgress(studyId)` — fetches the current user's completed lesson IDs.

**Left sidebar:**
- List of all lessons with their titles.
- Each lesson row shows a completion checkbox; checking it calls `api.markLessonComplete` / `api.unmarkLessonComplete`.
- A progress ring (SVG) in the sidebar header shows overall completion percentage (`completedLessonIds.length / lessons.length`).
- Clicking a lesson sets `activeLessonId`.

**Main pane tabs:**
- **Content** — lesson body (HTML from `RichEditor`, rendered via `innerHTML` or `RichContent`). Reflection prompt displayed below the main body. Verse reference links in content trigger `onOpenReference`.
- **Discussion** — post/comment feed scoped to this lesson (`api.listLessonPosts(lessonId)`). Post composer for logged-in members.
- **Participants** — list of study participants with completion status for the active lesson.
- **Resources** — footer resources (`StudyResource` records): commentary links, external links, and notes. Displayed as cards below the lesson body.

**Video playback:**
- If the lesson has a `videoUrl`, an HTML5 `<video>` player is rendered in the Content tab.

**`completedLessonIds` tracking:**
- Local state initialized from `api.getStudyProgress`. Toggling completion updates this state optimistically.

**Owner/admin controls:**
- "Edit Study" button visible to study creators and scriptorium admins → calls `onOpenBuilder`.

## Dependencies

- `api` (`../api/client.js`) — `getStudy`, `getStudyProgress`, `markLessonComplete`, `unmarkLessonComplete`, `listLessonPosts`, `createLessonPost`.
- `RichContent` — renders lesson body HTML with internal link handling.
- `PostFeed` (or inline post rendering) — discussion tab.

## Notes

- `StudyDetail` is rendered inside `ScriptoriumsView` when the URL matches `/scriptoriums/:id/study/:studyId`.
- Progress is per-user: each `StudyParticipant` records their own `completedLessonIds`.
- Resource footer types: `commentary` (links to a specific passage/module), `link` (external URL), `note` (inline rich text).
- The file is large (>500 lines); only the first 200 lines were read during wiki creation. Inner lesson content subcomponents and the full discussion/resource implementations may contain additional detail not captured here.
