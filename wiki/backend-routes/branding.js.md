# backend/src/routes/branding.js

## Purpose

Manages instance branding: display name, site URL, logo, and theme. The `GET /api/branding` endpoint is intentionally public so anonymous visitors see the correct name, logo, and theme before they log in. All write endpoints and the full settings read are admin-only.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/branding` | Public | Returns `{ name, logoUrl, theme }` |
| POST | `/api/branding` | Admin | Sets brand name; body `{ name }`; returns `{ name }` |
| GET | `/api/branding/settings` | Admin | Returns `{ name, siteUrl, logoUrl, theme }` |
| POST | `/api/branding/settings` | Admin | Accepts `{ name?, siteUrl?, theme? }`; updates whichever fields are present; returns updated values |
| POST | `/api/branding/logo` | Admin | Multipart upload (`logo` field); stores file to `uploads/branding/`; saves URL in `AppSetting`; returns `{ logoUrl }` |
| DELETE | `/api/branding/logo` | Admin | Removes the logo URL setting; returns 204 |

## Auth

- `GET /api/branding` — no auth required.
- All other endpoints require `requireAdmin`.

## Dependencies

- `brandingService` — `getBrandName`, `setBrandName`, `getSiteUrl`, `setSiteUrl`, `getLogoUrl`, `setLogoUrl`, `removeLogoUrl`, `getTheme`, `setTheme`
- `uploadLogo` middleware (from `middleware/upload.js`) — multer instance for `branding/` subdir, 2 MB limit, images only, field name `'logo'`
