# backend/src/services/moduleVisibilityService.js

## Purpose

Gives admins the ability to hide specific installed SWORD modules from regular users without uninstalling them. A row in `ModuleVisibility` is only created when an admin explicitly toggles a module; the absence of a row means the module is available. This service is called from route handlers that return module lists, filtering the list before it reaches non-admin users.

## Key exports

- **`isModuleAvailable(moduleCode)`** — Looks up a single module by code. Returns `true` (available) if no row exists; returns `row.availableToUsers` if a row does exist.
- **`filterAvailableModules(modules)`** — Takes an array of module objects (as returned by `swordService.listInstalledModules`) and removes any whose code appears in a single batch query for hidden modules. Avoids N+1 lookups.
- **`listVisibilityOverrides()`** — Returns all rows that have an explicit setting. Intended for the admin UI, which merges this list with the full installed-modules list to display the effective state of every module.
- **`setModuleAvailability(moduleCode, availableToUsers)`** — Upserts a `ModuleVisibility` row, creating it on first toggle or updating `availableToUsers` thereafter.

## Dependencies

- **Prisma models:** `ModuleVisibility`

## Patterns / notes

- **Absence-means-available default:** No rows need to be pre-populated when modules are installed. A row is created only the first time an admin actively changes a module's visibility state, keeping the table sparse.
- **Personal modules excluded:** The docstring notes that personal modules (`personal:` prefix) are never passed to `filterAvailableModules` — they are private per-user through a separate mechanism and this toggle is specifically about shared SWORD modules.
- **Batch hidden-set lookup:** `filterAvailableModules` fetches all hidden module codes in one query and filters in memory, rather than querying per module.
