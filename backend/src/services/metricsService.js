import { prisma } from '../db/prisma.js';

/** DB health via Postgres's own system views/functions — standard,
 *  well-documented Postgres introspection (pg_database_size,
 *  pg_stat_activity), not the kind of uncertain territory SWORD
 *  internals have been throughout this project. */
export async function getDbHealth() {
  const [sizeResult, connectionResult] = await Promise.all([
    prisma.$queryRaw`SELECT pg_database_size(current_database()) as size_bytes`,
    prisma.$queryRaw`SELECT count(*) as connections FROM pg_stat_activity WHERE datname = current_database()`,
  ]);
  // Postgres's count(*)/pg_database_size return bigint, which Prisma
  // maps to JS BigInt rather than a plain number — converted here so
  // this serializes cleanly to JSON (BigInt doesn't).
  return {
    sizeBytes: Number(sizeResult[0].size_bytes),
    connections: Number(connectionResult[0].connections),
  };
}

/** User activity, derived from data already tracked (lastLoginAt/
 *  createdAt/role) rather than a new event-logging system — a
 *  reasonable first cut at "usage" without building new tracking
 *  infrastructure. Worth revisiting with real per-feature event
 *  logging later if this isn't granular enough. */
export async function getUserMetrics() {
  const now = new Date();
  const day = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [total, admins, activeLast24h, activeLast7d, activeLast30d] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'admin' } }),
    prisma.user.count({ where: { lastLoginAt: { gte: day } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: week } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: month } } }),
  ]);

  return { total, admins, activeLast24h, activeLast7d, activeLast30d };
}

/** Rough engagement counts across the personal-data tables — an
 *  admin-wide aggregate, deliberately not scoped per-user the way
 *  every other query touching these tables elsewhere in the app is. */
export async function getContentMetrics() {
  const [notes, highlights, bookmarks, personalModules] = await Promise.all([
    prisma.note.count(),
    prisma.highlight.count(),
    prisma.bookmark.count(),
    prisma.personalModule.count(),
  ]);
  return { notes, highlights, bookmarks, personalModules };
}