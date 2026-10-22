# frontend/src/components/StudyBuilder.jsx

## Purpose

Study lesson editor for study owners and scriptorium admins. Left sidebar manages the study's metadata and lesson list. Right pane (`LessonEditor`) edits the content of the selected lesson. Supports AI-assisted lesson drafting, banner image upload with AI generation, and webcam video recording.

## Props

| Prop | Type | Description |
|---|---|---|
| `studyId` | string | ID of the study being edited |
| `auth` | object | `{ user, isLoggedIn }` |
| `onBack` | function | Returns to StudyDetail or Scriptorium view |

## State / key logic

**Study metadata (left sidebar):**
- Study title and description — saved on blur via `api.updateStudy`.
- **Lesson list** — `api.listStudyLessons(studyId)`. Reordering with up/down arrow buttons; delete per lesson.
- "Add Lesson" button creates a blank lesson via `api.createStudyLesson`.
- **Settings panel** (cog icon):
  - Banner image upload (`<input type="file" accept="image/*">` → FormData POST).
  - AI banner generation: form fields (topic, style prompt) → `api.generateStudyBanner(studyId, prompt)` → sets `bannerUrl`.
  - Delete study (with confirmation).

**`LessonEditor` sub-component (right pane):**
- Fields: title (text input), reference (verse reference), module (Bible module selector), body (`RichEditor`), reflection prompt (textarea).
- Auto-save on lesson switch: `pendingBodyRef` holds unsaved `RichEditor` content; `pendingBodyDirtyRef` tracks if it changed. On `activeLesson` change, flushes dirty body to `api.updateStudyLesson` before loading the new lesson.
- **Video:** If `lesson.videoUrl` exists, shows a playback preview. "Upload video" triggers a file input; upload via FormData. "Record webcam" uses `MediaRecorder` API to capture from `getUserMedia({ video: true, audio: true })`, creates a `.webm` blob, and uploads via the same endpoint.
- **Resources footer editor:** Add commentary/link/note resources to the lesson. Each resource type has its own form fields.

**`GenerateModal` (AI lesson drafting):**
- Two-step: (1) form with topic, Bible reference, lesson focus → submits to `api.generateLessonDraft`; (2) reviewing step shows the AI-generated title, body, and reflection prompt as editable text areas.
- Confirming the draft populates `LessonEditor` fields without saving immediately (user reviews before saving).

**Pending body refs pattern:**
- `pendingBodyRef = useRef(currentBody)` — updated on every `RichEditor` onChange without re-rendering.
- `pendingBodyDirtyRef = useRef(false)` — set to true on first change after lesson load.
- On lesson switch (or unmount): if `pendingBodyDirtyRef.current`, calls `api.updateStudyLesson(id, { body: pendingBodyRef.current })`.

## Dependencies

- `api` (`../api/client.js`) — study/lesson CRUD, banner generation, lesson draft generation, video upload.
- `RichEditor` — WYSIWYG editor for lesson body.
- MediaRecorder Web API — webcam recording.

## Notes

- `StudyBuilder` is rendered inside `ScriptoriumsView` when URL matches `/scriptoriums/:id/builder[/:studyId]`.
- The auto-save-on-switch pattern using refs (not state) avoids unnecessary re-renders while still flushing changes before navigation.
- Webcam recording produces `.webm` blobs (MediaRecorder default in Chrome/Firefox); the server stores them via the same PDF/media upload path.
- AI banner generation calls a Claude endpoint that returns an image URL (likely stored to object storage or served as a data URI).
