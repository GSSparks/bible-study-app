# backend/src/services/metricsService.js

## Purpose

Provides admin-facing metrics about database health and application usage. It queries PostgreSQL system views for database size and connection counts, and derives user-activity metrics from fields already tracked on the `User` model (`lastLoginAt`, `createdAt`, `role`) rather than building a separate event-logging system.

## Key exports

- **`getDbHealth()`** — Runs two raw SQL queries in parallel: `pg_database_size(current_database())` for the database size in bytes, and `pg_stat_activity` for the current active connection count. Returns `{ sizeBytes, connections }` as plain JavaScript numbers (Prisma returns PostgreSQL `bigint` as JS `BigInt`, which is converted here to avoid JSON serialization failures).
- **`getUserMetrics()`** — Returns counts for total users, admin users, and users active in the last 24 hours, 7 days, and 30 days, all derived from `lastLoginAt` comparisons.
- **`getContentMetrics()`** — Returns aggregate counts across `Note`, `Highlight`, `Bookmark`, and `PersonalModule` records — an admin-wide total, not scoped per user.

## Dependencies

- **Prisma models:** `User`, `Note`, `Highlight`, `Bookmark`, `PersonalModule`
- **PostgreSQL system views:** `pg_database_size`, `pg_stat_activity` (via `prisma.$queryRaw`)

## Patterns / notes

- **Raw SQL for system metrics:** Database size and connection count are not expressible as standard Prisma queries; `prisma.$queryRaw` with tagged template literals is the appropriate escape hatch here.
- **BigInt conversion:** Both raw query results return PostgreSQL `bigint` values, which Prisma maps to JS `BigInt`. Both are explicitly converted to `Number` before returning so the response serializes cleanly to JSON.
- **No per-user scoping on content metrics:** `getContentMetrics` is an admin aggregate intentionally, unlike every other query in the app that touches these models with a `userId` filter.
