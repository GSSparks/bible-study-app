# frontend/src/components/ReadingPlanView.jsx

## Purpose

Simpler reading plan view (appears to be an older or embedded alternative to `CursusView`). Renders a card grid of reading plans; selecting a card expands to a day checklist within the same component using state-based routing (no sidebar, no progress ring). Suitable for embedding inside another view or as a standalone lightweight plan viewer.

## Props

| Prop | Type | Description |
|---|---|---|
| `auth` | object | `{ user, isLoggedIn }` |
| `onOpenReference` | function | Called when user clicks a passage link |

## State / key logic

- `plans` — fetched via `api.listReadingPlans()` on mount.
- `selectedPlan` — clicking a card sets `selectedPlan`; clicking "Back" resets to null.
- **Card grid (no plan selected):** Each card shows title, description, and day count. Layout: responsive grid.
- **Day list (plan selected):** Replaces the card grid. Shows plan title + "Back" link + list of days with passages.
  - Each day row: day label, list of passage references as clickable links → `onOpenReference`.
  - Checkbox per day: `api.markDayComplete` / `api.unmarkDayComplete`. Login required for progress toggling; guests see the checklist read-only.
- `completedDays` — map from `dayIndex` to boolean, fetched per-plan from `api.getPlanProgress(planId)`.

## Dependencies

- `api` (`../api/client.js`) — `listReadingPlans`, `getPlanProgress`, `markDayComplete`, `unmarkDayComplete`.

## Notes

- This component co-exists with `CursusView` in the codebase. `CursusView` is the primary navigation destination for reading plans (with sidebar, progress ring, and admin editor). `ReadingPlanView` appears to be used for embedding in other contexts (e.g. a Scriptorium widget or an older route).
- No always-mounted pattern — conditionally rendered wherever it is placed.
- Admin creation/editing of plans is not available here; that capability lives in `CursusView`.
