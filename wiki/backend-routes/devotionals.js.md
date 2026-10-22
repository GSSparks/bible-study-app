# backend/src/routes/devotionals.js

## Purpose

Serves daily devotional content from a configurable SWORD dictionary module, where each entry key corresponds to a date. It exposes today's devotional reading, the list of available devotional modules, a diagnostic key-dump endpoint for admins, and a settings endpoint for selecting the active module. The entire router is gated behind login.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/devotionals/today` | Returns today's devotional entry from the currently active module |
| GET | `/api/devotionals/modules` | Lists all available devotional modules (synchronous — no DB query) |
| GET | `/api/devotionals/debug?module=<moduleCode>` | Admin-only; dumps the first 40 raw entry keys for the specified (or active) module to help diagnose key-format issues |
| POST | `/api/devotionals/settings` | Admin-only; sets the active devotional module; body: `{ moduleCode }` |

## Auth

`devotionalsRouter.use(requireLogin)` is applied at the router level. All endpoints require a valid session. `GET /api/devotionals/debug` and `POST /api/devotionals/settings` additionally require `requireAdmin`.

## Dependencies

- `devotionalService` — `listDevotionalModules`, `getTodaysDevotional`, `setActiveModule`, `getActiveModule`
- `swordService` — `getDictionaryKeys` (used only in the debug endpoint)
