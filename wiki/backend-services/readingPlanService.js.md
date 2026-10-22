# backend/src/services/readingPlanService.js

## Purpose

Manages reading plans — structured day-by-day Bible reading schedules — and per-user progress tracking against them. Two built-in plans are seeded at startup: a 90-day New Testament plan (3 chapters/day) and a 60-day Psalms & Proverbs plan (alternating one Psalm and one Proverb per day). Admins or the system can also create custom plans. Users track progress by marking individual days complete or incomplete.

## Key exports

- **`ensureBuiltInPlans()`** — Called at app startup to seed the two built-in plans if they don't exist yet. Also patches any NT plan that was seeded with an older truncated 10-day schedule, and creates the Psalms & Proverbs plan if it was previously skipped.
- **`listPlans()`** — Returns all plans ordered by built-in first, then creation date. Strips the `schedule` JSON from list results (returning only `dayCount`), since the full schedule is only needed when opening a specific plan.
- **`getPlan(id)`** — Returns the full plan record including the `schedule` JSON array.
- **`createPlan({ name, description, schedule })`** — Creates a custom (non-built-in) plan.
- **`updatePlan(id, { name, description, schedule })`** — Updates a custom plan. Throws 403 if the plan is built-in.
- **`deletePlan(id)`** — Deletes a custom plan and all associated progress rows. Throws 403 if built-in.
- **`getUserProgress(userId, planId)`** — Returns an array of completed day numbers for the given user and plan.
- **`markDayComplete(userId, planId, dayNumber)`** — Upserts a `ReadingPlanProgress` row for the day.
- **`markDayIncomplete(userId, planId, dayNumber)`** — Deletes the progress row for the day.
- **`resetUserProgress(userId, planId)`** — Deletes all progress rows for the user on a given plan.

## Dependencies

- **Prisma models:** `ReadingPlan`, `ReadingPlanProgress`

## Patterns / notes

- **Schedule generation is pure JS:** `buildNT90DayPlan` and `buildPsalmsProverbsPlan` are plain functions that produce arrays of `{ day, label, passages }` objects from hardcoded book/chapter data. The NT plan groups consecutive same-book chapters into readable labels (e.g. "Matthew 1–3").
- **Built-in plan protection:** `updatePlan` and `deletePlan` both check `plan.isBuiltIn` and throw a 403 before making changes, protecting the seeded plans from accidental modification.
- **Patch migration in `ensureBuiltInPlans`:** The service detects and repairs a previously shipped bug (truncated 10-day NT schedule) by checking `schedule.length < 50` and replacing the data. This is a one-time self-healing migration that runs at startup.
- **Upsert for progress:** `markDayComplete` uses Prisma's `upsert` so marking an already-complete day is a no-op rather than a unique-constraint error.
