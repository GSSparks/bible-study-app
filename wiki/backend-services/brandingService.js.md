# backend/src/services/brandingService.js

## Purpose

Manages the application's display name ("brand name") stored as a key-value row in the `AppSetting` table. The brand name appears in the sidebar before any login state is known, so `getBrandName` is intentionally accessible to anonymous visitors. The service exists as a thin abstraction over a single `AppSetting` key so routing code does not need to know the storage mechanism.

## Key exports

- **`getBrandName()`** — Reads the `brand_name` key from `AppSetting`. Returns the stored value, or `"My Scriptorium"` if no row exists yet.
- **`setBrandName(name)`** — Validates that the name is non-empty and at most 60 characters, then upserts the `brand_name` row. Returns the trimmed value on success.

## Dependencies

- **Prisma models:** `AppSetting`

## Patterns / notes

- **Upsert pattern:** `setBrandName` uses Prisma's `upsert` so both initial setup and subsequent changes work with the same call, with no pre-check for row existence.
- **Input validation:** Validation (empty check, length cap) happens in the service rather than in the route, keeping the error path consistent regardless of which route calls it.
- **Default fallback:** The default value `"My Scriptorium"` is a module-level constant, never written to the database until an admin explicitly sets something, keeping the initial state clean.
