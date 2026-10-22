# frontend/src/components/CursusView.jsx

## Purpose

Reading plans view ("Cursus"). Left sidebar lists available plans with progress bars. The right pane shows plan details: a day checklist, a progress ring, an "Up Next" badge for the next incomplete day, and an admin editor for creating and editing plans.

## Props

| Prop | Type | Description |
|---|---|---|
| `isActive` | boolean | CSS visibility toggle (always-mounted pattern) |
| `auth` | object | `{ user, isLoggedIn }` |
| `onOpenReference` | function | Called when user clicks a passage link to navigate CellView |

## State / key logic

**Plan list:**
- Fetched via `api.listReadingPlans()` on mount.
- Each plan card shows title, total days, completed day count, and a progress bar.
- Selecting a plan sets `selectedPlanId` and loads plan detail.

**Plan detail (right pane):**
- Checklist of days (`plan.days` array). Each day shows a label and a list of passage references (clickable → `onOpenReference`).
- `completedDays` map keyed by `planId`. Toggle day completion via `api.markDayComplete` / `api.unmarkDayComplete`.
- **Progress ring** — SVG circle with `strokeDashoffset` proportional to `completedCount / totalDays`.
- **"Up Next" badge** — first day where completion is false; highlighted in the list and shown in the plan header.

**Admin editor:**
- Visible only to admin users (`auth.user?.role === 'admin'`).
- `textarea`-based schedule format: each line is `Label | passage1, passage2, ...`.
- `parseScheduleText(text)` — converts textarea content to `days` array.
- `scheduleToText(days)` — converts `days` array back to textarea format for editing.
- Create / Edit / Delete operations via `api.createReadingPlan` / `api.updateReadingPlan` / `api.deleteReadingPlan`.

**Progress persistence:**
- `progressMap` state keyed by `planId`; updated optimistically on toggle.
- Server-side progress stored in the `ReadingPlan` participation model.

## Dependencies

- `api` (`../api/client.js`) — `listReadingPlans`, `getReadingPlan`, `markDayComplete`, `unmarkDayComplete`, `createReadingPlan`, `updateReadingPlan`, `deleteReadingPlan`.

## Notes

- "Cursus" is the Latin word for a scheduled course of reading, historically used for daily office / lectionary reading.
- Admin textarea format (`Label | passage1, passage2`) is intentionally plain-text for easy editing without a complex form.
- The component is always-mounted but progress is only fetched/shown to logged-in users; guests see the plan structure without progress tracking.
