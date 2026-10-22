# backend/src/routes/readingPlans.js

## Purpose

Manages structured reading plans and per-user progress tracking. Admins create, update, and delete plans; any user can list plans and track their own progress (marking individual days complete or resetting entirely). Plan listing and detail retrieval are public; progress endpoints require login.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reading-plans` | Lists all available reading plans |
| POST | `/api/reading-plans` | Creates a new reading plan; admin-only; body: `{ name, description?, schedule: [] }` |
| GET | `/api/reading-plans/:id` | Returns a specific plan's details including its schedule |
| PATCH | `/api/reading-plans/:id` | Updates a plan's name, description, or schedule; admin-only |
| DELETE | `/api/reading-plans/:id` | Deletes a reading plan; admin-only |
| GET | `/api/reading-plans/:id/progress` | Returns `{ completedDays: [] }` for the current user on the specified plan; requires login |
| POST | `/api/reading-plans/:id/progress` | Marks a day as complete; requires login; body: `{ dayNumber }` |
| DELETE | `/api/reading-plans/:id/progress` | Resets all progress for the current user on the specified plan; requires login |
| DELETE | `/api/reading-plans/:id/progress/:dayNumber` | Marks a specific day as incomplete; requires login |

## Auth

- `GET /api/reading-plans` and `GET /api/reading-plans/:id` are public.
- `POST`, `PATCH`, `DELETE /api/reading-plans` and `DELETE /api/reading-plans/:id` require `requireAdmin`.
- All `/progress` routes require `requireLogin`.

## Dependencies

- `readingPlanService` — `listPlans`, `getPlan`, `createPlan`, `updatePlan`, `deletePlan`, `getUserProgress`, `markDayComplete`, `markDayIncomplete`, `resetUserProgress`
