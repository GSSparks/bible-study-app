import { prisma } from '../db/prisma.js';

/** No row for a module means "available" — the default — so nothing
 *  needs to be pre-populated for every installed module; a row only
 *  gets created the first time an admin actually toggles something. */
export async function isModuleAvailable(moduleCode) {
  const row = await prisma.moduleVisibility.findUnique({ where: { moduleCode } });
  return row ? row.availableToUsers : true;
}

/** Filters a module list (as returned by swordService.listInstalledModules
 *  or listPersonalModules) down to only the ones available to
 *  non-admin users. Personal modules are never filtered here — they're
 *  already private per-user via a completely separate mechanism, and
 *  this visibility toggle is specifically about real installed SWORD
 *  modules an admin might not want exposed yet. */
export async function filterAvailableModules(modules) {
  const hidden = await prisma.moduleVisibility.findMany({ where: { availableToUsers: false } });
  const hiddenCodes = new Set(hidden.map((h) => h.moduleCode));
  return modules.filter((m) => !hiddenCodes.has(m.name));
}

/** Every module the admin has an explicit visibility setting for —
 *  used to show current state in the admin UI. Modules never toggled
 *  don't appear here (they're implicitly available); the admin UI is
 *  expected to merge this against the full installed-modules list to
 *  show every module's actual state. */
export async function listVisibilityOverrides() {
  return prisma.moduleVisibility.findMany();
}

export async function setModuleAvailability(moduleCode, availableToUsers) {
  return prisma.moduleVisibility.upsert({
    where: { moduleCode },
    create: { moduleCode, availableToUsers },
    update: { availableToUsers },
  });
}