# frontend/src/components/ReadingPlanTab.jsx

## Purpose

Reading plans tab extracted from the original `CursusView`. Shows a sidebar list of available plans with per-plan progress bars and a right pane with plan detail — a day-by-day checklist with clickable passage links, an "Up Next" badge, and an admin editor for creating, editing, and deleting plans.

## Props

| Prop | Type | Description |
|---|---|---|
| `isLoggedIn` | boolean | Gates progress tracking; guests see structure but cannot mark days |
| `isAdmin` | boolean | Shows New/Edit/Delete controls |
| `onOpenInBible` | function | Called with a passage string when user clicks a passage link |

## State / key logic

**Plan list (sidebar):**
- Fetched via `api.listReadingPlans()` on mount; each plan card shows name, optional description, and a progress bar if progress data is available.
- `progress` is a `Map<planId, Set<dayNumber>>` — keyed so multiple plans can have cached progress.
- Clicking a plan sets `selectedId` and loads full plan + completed days in parallel. On mobile, also sets `mobileShowDetail = true` to switch the view.

**Plan detail (right pane):**
- Shows plan title, description, and an overall `completedCount / dayCount` progress bar.
- Each day row has: a checkbox-style toggle button, `Day N` label, an "Up Next" badge on the first incomplete day, the day label (strikethrough when done), and passage reference buttons.
- `toggleDay(planId, dayNumber)` — optimistic: updates `progress` immediately, then calls `api.markReadingPlanDay` or `api.unmarkReadingPlanDay` in the background.
- Reset button (`handleReset`) calls `api.resetReadingPlanProgress` and clears the plan's Set in the progress Map.

**Admin editor:**
- `editing` state: `null` (view mode), `'new'` (create), or a plan ID (edit).
- Schedule textarea format: one day per line, `Label | passage1, passage2, ...`. `parseScheduleText(text)` converts lines to `[{ day, label, passages }]`. `scheduleToText(schedule)` converts back.
- Create: `api.createReadingPlan({ name, description, schedule })`.
- Update: `api.updateReadingPlan(id, { name, description, schedule })`.
- Delete: inline confirm → `api.deleteReadingPlan(id)`.

**Mobile layout:**
- `mobileShowDetail` state: sidebar is `hidden lg:flex` when detail is shown; detail pane is `hidden lg:flex` when at list.
- A "back" button in the right pane (mobile only, `lg:hidden`) resets `mobileShowDetail` and clears `selectedId`.

## Dependencies

- `api` — `listReadingPlans`, `getReadingPlan`, `getReadingPlanProgress`, `markReadingPlanDay`, `unmarkReadingPlanDay`, `resetReadingPlanProgress`, `createReadingPlan`, `updateReadingPlan`, `deleteReadingPlan`
- Lucide icons: `BookMarked`, `Check`, `ChevronLeft`, `Pencil`, `Plus`, `RotateCcw`, `Trash2`, `X`

## Notes

- Progress is only fetched when `isLoggedIn` is true; the plan structure (labels, passages) is visible to all users.
- `upNextDay` is computed as the first day in `fullPlan.schedule` that is not in `completedSet`.
- The `confirmDeleteId` state provides inline two-step delete confirmation without a modal.
- `parseScheduleText` and `scheduleToText` are module-level helper functions shared between create and edit flows.
