# backend/src/services/brandingService.js

## Purpose

Manages all application branding settings stored as key-value rows in the `AppSetting` table: brand name, site URL, logo URL, and theme. The service is a thin abstraction over `AppSetting` upserts so routing code does not need to know the storage keys. `getBrandName` is intentionally accessible to anonymous visitors because the sidebar must show the correct name before any login state is known.

## Key exports

- **`getBrandName()`** — Reads `brand_name` from `AppSetting`. Returns the stored value, or `'My Scriptorium'` if no row exists.
- **`setBrandName(name)`** — Validates non-empty and ≤ 60 characters. Upserts `brand_name`. Returns the trimmed value.
- **`getSiteUrl()`** — Reads `site_url`. Returns stored value or `null`.
- **`setSiteUrl(url)`** — Validates `https?://` prefix and ≤ 255 characters. Trailing slash is stripped. An empty string deletes the row (returns `null`). Upserts `site_url`.
- **`getLogoUrl()`** — Reads `brand_logo_url`. Returns stored URL or `null`.
- **`setLogoUrl(url)`** — Upserts `brand_logo_url` with the given URL.
- **`removeLogoUrl()`** — Deletes the `brand_logo_url` row (via `deleteMany`).
- **`getTheme()`** — Reads `brand_theme`. Returns stored theme string or `null`.
- **`setTheme(theme)`** — Validates against an allowlist: `scriptorium`, `vesper`, `aegean`, `codex`, `gruvbox`. An empty/null value deletes the row (returns `null`). Upserts `brand_theme`.

## Dependencies

- **Prisma models:** `AppSetting`

## Patterns / notes

- **Upsert pattern:** All setters use Prisma `upsert` so both initial setup and subsequent changes work with the same call.
- **Input validation:** Validation happens in the service, not the route, keeping error handling consistent regardless of which caller invokes it.
- **Default fallback:** `getBrandName` falls back to `'My Scriptorium'` without writing to the database — the default is only persisted once an admin explicitly sets something.
- **Theme validation:** `setTheme` uses a `Set` of valid theme IDs. Passing an invalid theme throws a 400 error. Passing an empty string/null removes the theme setting entirely.
- **Logo storage:** `setLogoUrl` stores the relative URL (e.g. `/uploads/branding/<uuid>.jpg`) set by the route handler after multer saves the file; it does not handle the file itself.
