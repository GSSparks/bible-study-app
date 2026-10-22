# backend/src/routes/branding.js

## Purpose

Manages the instance's display name (the "brand name" shown in the sidebar and elsewhere in the UI). The GET endpoint is intentionally public so anonymous visitors see the correct name before they log in. The POST endpoint is admin-only to prevent users from changing the instance name.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/branding` | Returns `{ name: string }` — the current brand name for the instance |
| POST | `/api/branding` | Sets a new brand name; body: `{ name: string }`; returns `{ name: string }` |

## Auth

- `GET /api/branding` is public (no auth required).
- `POST /api/branding` requires `requireAdmin`.

## Dependencies

- `brandingService` — `getBrandName`, `setBrandName`
