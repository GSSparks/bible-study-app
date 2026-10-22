# backend/src/services/devotionalService.js

## Purpose

Exposes daily devotional content from installed SWORD modules. It delegates module discovery and date-keyed entry fetching to `swordService`, and persists the admin's choice of active devotional module in `AppSetting`. The main responsibility of this layer is shaping the returned entries: labelling morning/evening pairs for two-entry modules (e.g. Spurgeon), and merging multi-entry days (e.g. Wesley's Notes) into a single reading.

## Key exports

- **`listDevotionalModules()`** — Delegates directly to `swordService.listDevotionalModules()`, which identifies devotional modules by scanning installed COMMENTARY/DICT/BOOK modules for "daily", "morning", "evening", "devotion", or "devotional" in their name or description.
- **`getActiveModule()`** — Reads the `devotional_module` key from `AppSetting`. Falls back to the first module returned by `listDevotionalModules()` if no setting has been saved, or `null` if none are installed.
- **`setActiveModule(moduleCode)`** — Upserts the `devotional_module` key in `AppSetting` to record the admin's selection.
- **`getTodaysDevotional()`** — Calls `swordService.getDevotionalEntry` with today's date for the active module, then shapes the results: two entries become `Morning`/`Evening`-labelled objects; more than two are merged into a single combined entry; one entry or none are returned as-is with a `null` label. Returns `{ available: false, modules }` if no module is active or no entries are found for today.

## Dependencies

- **Prisma models:** `AppSetting`
- **Other services:** `swordService.js`

## Patterns / notes

- **Thin coordination layer:** This service contains no text processing of its own — all SWORD interaction and date-pattern matching is in `swordService`. The service's sole logic is the entry-count-based labelling/merging.
- **Graceful unavailability:** `getTodaysDevotional` always includes the `modules` list in its response even when `available` is `false`, so the frontend can prompt the user to install or select a module.
- **Upsert persistence:** `setActiveModule` uses Prisma's `upsert` so it works whether or not a `devotional_module` row already exists.
