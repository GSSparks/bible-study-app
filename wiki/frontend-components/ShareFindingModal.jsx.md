# frontend/src/components/ShareFindingModal.jsx

## Purpose

A floating form to share a passage finding (with optional title and body) to one of the user's active Studies. Triggered from the verse-selection toolbar in `ReaderPane` when the user clicks "Share →". Loads the user's active studies on mount, pre-fills the body with a blockquote of the verse text, and posts a finding via `api.createStudyPost`.

## Props

| Prop | Type | Description |
|---|---|---|
| `reference` | string | The Bible reference for the finding |
| `module` | string | The Bible module |
| `verseText` | string | Verse text (used to pre-fill the quote blockquote) |
| `x` | number | Horizontal position |
| `y` | number | Vertical position |
| `onClose` | func | Dismiss the modal |
| `onShared` | func | Called after a successful submit (so ReaderPane can re-fetch group findings) |

## State / Key Logic

- `studies` — loaded from `api.listMyStudies()` on mount. `null` = loading.
- `studyId` — pre-selected to `studies[0].id` when the list loads.
- `body` — pre-filled with `> verseText\n\n` from the verse text prop.
- On mount, focuses the textarea and places cursor at end (after the blockquote) once studies load.
- Outside-click closes via `mousedown` listener on `document`.
- Position clamped: `left = min(x, window.innerWidth - 340)`, `top = min(y, window.innerHeight - 280)`.
- Submit calls `api.createStudyPost(studyId, { type: 'finding', reference, module, title, body })`.

## Dependencies

- `api.listMyStudies`, `api.createStudyPost`
- `createPortal`

## Notes

- Shows "You're not participating in any studies yet" when `studies` is an empty array — a user cannot share findings without belonging to a study.
- The form is intentionally compact (320 px wide) because it appears as an inline popup near the verse, not as a centered dialog.
