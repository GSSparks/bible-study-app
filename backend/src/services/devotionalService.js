import { swordService } from './swordService.js';
import { prisma } from '../db/prisma.js';

const SETTING_KEY = 'devotional_module';

export function listDevotionalModules() {
  return swordService.listDevotionalModules();
}

export async function getActiveModule() {
  const setting = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } });
  if (setting?.value) return setting.value;
  const mods = listDevotionalModules();
  return mods[0]?.name ?? null;
}

export async function setActiveModule(moduleCode) {
  await prisma.appSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: moduleCode },
    update: { value: moduleCode },
  });
}

export async function getTodaysDevotional() {
  const modules = listDevotionalModules();
  const moduleCode = await getActiveModule();

  if (!moduleCode) {
    return { available: false, modules };
  }

  const date = new Date();
  const entries = swordService.getDevotionalEntry(moduleCode, date);

  if (entries.length === 0) {
    return { available: false, modules };
  }

  // Two entries = morning/evening pattern (Spurgeon etc.); label them.
  const labelled = entries.map((e, i) => ({
    ...e,
    label: entries.length === 2 ? (i === 0 ? 'Morning' : 'Evening') : null,
  }));

  return {
    available: true,
    moduleCode,
    date: date.toISOString().split('T')[0],
    entries: labelled,
    modules,
  };
}
