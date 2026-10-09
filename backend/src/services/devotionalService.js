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
  // More than two = multiple verse entries for the same day (e.g. Wesley's
  // Notes) — merge into one reading so they don't become confusing tabs.
  let labelled;
  if (entries.length === 2) {
    labelled = entries.map((e, i) => ({ ...e, label: i === 0 ? 'Morning' : 'Evening' }));
  } else if (entries.length > 2) {
    labelled = [{
      ...entries[0],
      text: entries.map((e) => e.text).filter(Boolean).join('\n\n'),
      content: entries.map((e) => e.content).filter(Boolean).join('\n\n'),
      label: null,
    }];
  } else {
    labelled = entries.map((e) => ({ ...e, label: null }));
  }

  return {
    available: true,
    moduleCode,
    date: date.toISOString().split('T')[0],
    entries: labelled,
    modules,
  };
}
