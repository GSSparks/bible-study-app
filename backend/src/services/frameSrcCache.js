/**
 * In-memory cache of allowed iframe origins, derived from the url field of
 * external Document records. Helmet reads this on every request via a
 * function directive so the CSP always reflects the current set without a
 * server restart. Routes call refresh() after creating, updating, or
 * deleting external resources.
 */

import { prisma } from '../db/prisma.js';

const _origins = new Set();

function _extractOrigin(url) {
  try {
    const { origin } = new URL(url);
    return origin === 'null' ? null : origin;
  } catch {
    return null;
  }
}

export function getFrameSrcOrigins() {
  return [..._origins];
}

export async function refreshFrameSrcCache() {
  const docs = await prisma.document.findMany({
    where: { sourceType: 'external', url: { not: null } },
    select: { url: true },
  });
  _origins.clear();
  for (const { url } of docs) {
    const origin = _extractOrigin(url);
    if (origin) _origins.add(origin);
  }
}
