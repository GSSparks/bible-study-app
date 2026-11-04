// backend/src/services/calendarService.js

import { prisma } from '../db/prisma.js';
import { swordService } from './swordService.js';
import { HebrewCalendar, HDate, months } from '@hebcal/core';
import rrule from 'rrule';
import fs from 'fs';
import path from 'path';

const UPLOADS_PATH = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');
const DAY_BG_DIR = path.join(UPLOADS_PATH, 'calendar', 'day-bg');
if (!fs.existsSync(DAY_BG_DIR)) fs.mkdirSync(DAY_BG_DIR, { recursive: true });
const { RRule } = rrule;
const MAX_LAYER_NAME_LENGTH = 60;
const MAX_ENTRY_TITLE_LENGTH = 120;
const MAX_ENTRY_DESCRIPTION_LENGTH = 500;
const MAX_COVER_TITLE_LENGTH = 80;
const MAX_COVER_VERSE_REF_LENGTH = 50;
const JULIAN_OFFSET = 13; // valid 1900–2099

export function listFontFiles() {
  const dir = path.join(UPLOADS_PATH, 'calendar', 'fonts');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /\.(ttf|otf|woff2?)$/i.test(f));
}

export function saveFontFile(filename) {
  const dir = path.join(UPLOADS_PATH, 'calendar', 'fonts');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, filename);
}

export function deleteFontFile(filename) {
  const filePath = path.join(UPLOADS_PATH, 'calendar', 'fonts', filename);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

export function julianToGregorian(year, month, day) {
  const d = new Date(Date.UTC(year, month - 1, day + JULIAN_OFFSET));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function julianDateToGregorian(julianDate) {
  return new Date(julianDate.getTime() + JULIAN_OFFSET * 86400000);
}

export function isJulianLayer(entry) {
  return entry.layer?.calendarSystem === 'julian';
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateLayer({ name, color, calendarSystem }) {
  if (!name || !name.trim()) {
    const err = new Error('A name is required.');
    err.status = 400;
    throw err;
  }
  if (name.length > MAX_LAYER_NAME_LENGTH) {
    const err = new Error(`Name must be ${MAX_LAYER_NAME_LENGTH} characters or fewer.`);
    err.status = 400;
    throw err;
  }
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    const err = new Error('A valid hex color (e.g. "#3F7168") is required.');
    err.status = 400;
    throw err;
  }
  if (calendarSystem !== 'gregorian' && calendarSystem !== 'hebrew' && calendarSystem !== 'julian') {
    const err = new Error('calendarSystem must be "gregorian", "hebrew", or "julian".');
    err.status = 400;
    throw err;
  }
}

export function validateEntry({ title, year, month, day, recurrence }) {
  if (!title || !title.trim()) {
    const err = new Error('A title is required.');
    err.status = 400;
    throw err;
  }
  if (title.length > MAX_ENTRY_TITLE_LENGTH) {
    const err = new Error(`Title must be ${MAX_ENTRY_TITLE_LENGTH} characters or fewer.`);
    err.status = 400;
    throw err;
  }
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    const err = new Error('A valid year (1–9999) is required.');
    err.status = 400;
    throw err;
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    const err = new Error('A valid month (1–12) is required.');
    err.status = 400;
    throw err;
  }
  if (day !== null && day !== undefined && (!Number.isInteger(day) || day < 1 || day > 31)) {
    const err = new Error('A valid day (1–31) is required.');
    err.status = 400;
    throw err;
  }
}

export function validatePrintConfig({ year, layout, paper, orientation }) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    const err = new Error('A valid year is required.');
    err.status = 400;
    throw err;
  }
  const layouts = ['single-month', '2-month', 'quarterly', '12-month'];
  if (!layouts.includes(layout)) {
    const err = new Error(`layout must be one of: ${layouts.join(', ')}.`);
    err.status = 400;
    throw err;
  }
  if (paper !== 'letter' && paper !== 'a4') {
    const err = new Error('paper must be "letter" or "a4".');
    err.status = 400;
    throw err;
  }
  if (orientation !== 'portrait' && orientation !== 'landscape') {
    const err = new Error('orientation must be "portrait" or "landscape".');
    err.status = 400;
    throw err;
  }
}

// ─── Built-in Layer Seeding ───────────────────────────────────────────────────

const BUILT_IN_LAYERS = [
  { name: 'Civil',             color: '#888888', calendarSystem: 'gregorian' },
{ name: 'Western Christian', color: '#4a90d9', calendarSystem: 'gregorian' },
{ name: 'Hebrew',            color: '#d4a843', calendarSystem: 'hebrew'    },
{ name: 'Eastern Christian', color: '#c0392b', calendarSystem: 'julian'    },
];


export async function listDayImages(userId, year, month) {
  const images = await prisma.dayImage.findMany({
    where: { userId, year, month },
    select: { day: true, imageUrl: true },
  });
  const result = {};
  for (const img of images) {
    result[`${year}-${String(month).padStart(2, '0')}-${String(img.day).padStart(2, '0')}`] = img.imageUrl;
  }
  return result;
}

export async function setDayImage(userId, { year, month, day, imageUrl, layerId }) {
  return prisma.dayImage.upsert({
    where: {
      year_month_day_layerId: { year, month, day, layerId },
    },
    update: { imageUrl, userId },
    create: { year, month, day, imageUrl, layerId, userId },
  });
}

export async function removeDayImage(userId, year, month, day, layerId) {
  await prisma.dayImage.deleteMany({
    where: { userId, year, month, day, layerId },
  });
}

export function listDayBgFiles() {
  if (!fs.existsSync(DAY_BG_DIR)) return [];
  return fs.readdirSync(DAY_BG_DIR).filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f));
}

export function deleteDayBgFile(filename) {
  const filePath = path.join(DAY_BG_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

/** Ensures the 4 system layers exist globally. Idempotent — safe to call on every request. */
export async function ensureBuiltInLayers() {
  // Remove duplicate built-in layers (keep the oldest of each name)
  const builtIns = await prisma.calendarLayer.findMany({
    where: { userId: null, isBuiltIn: true },
    orderBy: { createdAt: 'asc' },
  });

  const seen = new Set();
  const toDelete = [];
  for (const layer of builtIns) {
    if (seen.has(layer.name)) {
      toDelete.push(layer.id);
    } else {
      seen.add(layer.name);
    }
  }

  if (toDelete.length > 0) {
    await prisma.calendarLayer.deleteMany({
      where: { id: { in: toDelete } },
    });
  }

  // Ensure each built-in layer exists
  for (const b of BUILT_IN_LAYERS) {
    const existing = await prisma.calendarLayer.findFirst({
      where: { userId: null, name: b.name },
    });

    if (!existing) {
      await prisma.calendarLayer.create({
        data: { userId: null, ...b, isBuiltIn: true },
      });
    }
  }
}

// ─── Layer CRUD ───────────────────────────────────────────────────────────────

/** All layers visible to this user: system (universal) + owned + shared-with-them.
 *  Per-user visibility overrides for system layers are resolved here. */
export async function listLayers(userId) {

  const [systemLayers, owned, sharedShares, visOverrides] = await Promise.all([
    prisma.calendarLayer.findMany({
      where: { userId: null, isBuiltIn: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.calendarLayer.findMany({
      where: { userId },
      orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.calendarLayerShare.findMany({
      where: { userId },
      include: { layer: true, user: { select: { displayName: true, username: true } } },
    }),
    prisma.userLayerVisibility.findMany({ where: { userId } }),
  ]);

  const visMap = Object.fromEntries(visOverrides.map(v => [v.layerId, v.visible]));

  return [
    // System layers — visibility from override table, default true
    ...systemLayers.map((l) => ({
      ...l,
      visible: visMap[l.id] ?? true,
      shared: false,
      sharedBy: null,
      myShareRole: null,
    })),
    // User's own layers
    ...owned.map((l) => ({
      ...l,
      shared: false,
      sharedBy: null,
      myShareRole: null,
    })),
    // Layers shared with this user
    ...sharedShares.map((s) => ({
      ...s.layer,
      shared: true,
      sharedBy: s.user?.displayName || s.user?.username || 'unknown',
      myShareRole: s.role,
    })),
  ];
}

export async function createLayer(userId, { name, color, calendarSystem = 'gregorian' }) {
  validateLayer({ name, color, calendarSystem });
  return prisma.calendarLayer.create({
    data: { name: name.trim(), color, calendarSystem, userId },
  });
}

export async function updateLayer(layerId, userId, { name, color, visible }) {
  const layer = await prisma.calendarLayer.findUnique({ where: { id: layerId } });
  if (!layer) {
    const err = new Error('Layer not found.');
    err.status = 404;
    throw err;
  }

  // System layer: only visibility can be toggled (per-user override)
  if (layer.userId === null) {
    if (name !== undefined || color !== undefined) {
      const err = new Error('System layers cannot be renamed or recolored.');
      err.status = 400;
      throw err;
    }
    if (visible !== undefined) {
      await prisma.userLayerVisibility.upsert({
        where: { userId_layerId: { userId, layerId } },
        update: { visible },
        create: { userId, layerId, visible },
      });
    }
    return { ...layer, visible: visible ?? layer.visible };
  }

  // User-owned layer: must be the owner
  if (layer.userId !== userId) {
    const err = new Error('Layer not found.');
    err.status = 404;
    throw err;
  }

  if (layer.isBuiltIn && (name || color)) {
    const err = new Error('Built-in layers cannot be renamed or recolored.');
    err.status = 400;
    throw err;
  }

  if (name !== undefined) {
    if (!name.trim()) {
      const err = new Error('Name cannot be empty.');
      err.status = 400;
      throw err;
    }
    if (name.length > MAX_LAYER_NAME_LENGTH) {
      const err = new Error(`Name must be ${MAX_LAYER_NAME_LENGTH} characters or fewer.`);
      err.status = 400;
      throw err;
    }
  }
  if (color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    const err = new Error('A valid hex color is required.');
    err.status = 400;
    throw err;
  }

  return prisma.calendarLayer.update({
    where: { id: layerId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
                                     ...(color !== undefined && { color }),
                                     ...(visible !== undefined && { visible }),
    },
  });
}

export async function deleteLayer(layerId, userId) {
  const layer = await prisma.calendarLayer.findUnique({ where: { id: layerId } });
  if (!layer) {
    const err = new Error('Layer not found.');
    err.status = 404;
    throw err;
  }

  // System layers cannot be deleted
  if (layer.userId === null) {
    const err = new Error('System layers cannot be deleted — hide them instead.');
    err.status = 400;
    throw err;
  }

  if (layer.userId !== userId) {
    const err = new Error('Layer not found.');
    err.status = 404;
    throw err;
  }

  if (layer.isBuiltIn) {
    const err = new Error('Built-in layers cannot be deleted — hide them instead.');
    err.status = 400;
    throw err;
  }

  await prisma.calendarLayer.delete({ where: { id: layerId } });
}

// ─── Entry CRUD ───────────────────────────────────────────────────────────────

/** All entries for a given month, across the user's visible layers (system + owned + shared). */
export async function listEntriesForMonth(userId, year, month) {
  await ensureBuiltInLayers();

  const [systemLayers, ownedLayers, sharedShares, visOverrides] = await Promise.all([
    prisma.calendarLayer.findMany({ where: { userId: null, isBuiltIn: true } }),
                                                                                    prisma.calendarLayer.findMany({ where: { userId, visible: true } }),
                                                                                    prisma.calendarLayerShare.findMany({
                                                                                      where: { userId, layer: { visible: true } },
                                                                                      include: { layer: true },
                                                                                    }),
                                                                                    prisma.userLayerVisibility.findMany({ where: { userId } }),
  ]);

  const visMap = Object.fromEntries(visOverrides.map(v => [v.layerId, v.visible]));


  const allLayers = [
    ...systemLayers.filter((l) => visMap[l.id] ?? true),
    ...ownedLayers,
    ...sharedShares.filter((s) => s.layer).map((s) => s.layer),
  ];
  const layerIds = allLayers.map((l) => l.id);

  if (layerIds.length === 0) return [];

  const directEntries = await prisma.calendarEntry.findMany({
    where: {
      layerId: { in: layerIds },
      year,
      month,
      recurrence: null,
    },
    include: { layer: { select: { id: true, name: true, color: true, calendarSystem: true } } },
    orderBy: { day: 'asc' },
  });

  // Auto-generate system layer entries on first load for the year
  const currentYear = year;
  for (const l of allLayers.filter(l => l.isBuiltIn)) {
    const count = await prisma.calendarEntry.count({ where: { layerId: l.id, year: currentYear } });
    if (count === 0) {
      if (l.name === 'Civil') {
        const cfg = await prisma.userLayerConfig.findUnique({
          where: { userId_layerId: { userId, layerId: l.id } },
        });
        if (cfg?.config?.country) {
          await generateCivilEntries(userId, l.id, currentYear, cfg.config.country);
        }
      } else if (l.name === 'Hebrew') {
        await generateHebrewEntries(userId, l.id, currentYear);
      } else if (l.name === 'Western Christian' || l.name === 'Eastern Christian') {
        const tradition = l.name === 'Western Christian' ? 'western' : 'eastern';
        const cfg = await prisma.userLayerConfig.findUnique({
          where: { userId_layerId: { userId, layerId: l.id } },
        });
        let enabledKeys = cfg?.config?.enabledHolidays ?? null;
        // Default: Western → Protestant, Eastern → all (they're all Eastern anyway)
        if (enabledKeys === null && tradition === 'western') {
          enabledKeys = getPresetKeys('protestant', tradition, currentYear);
        }
        await generateChristianEntries(userId, l.id, currentYear, tradition, enabledKeys);
      }
    }
  }


  const convertedDirect = directEntries.map((e) => {
    if (isJulianLayer(e) && e.day) {
      const g = julianToGregorian(e.year, e.month, e.day);
      return { ...e, year: g.year, month: g.month, day: g.day };
    }
    return e;
  });

  const recurringEntries = await prisma.calendarEntry.findMany({
    where: {
      layerId: { in: layerIds },
      recurrence: { not: null },
    },
    include: { layer: { select: { id: true, name: true, color: true, calendarSystem: true } } },
  });

  const expandedRecurring = [];
  for (const entry of recurringEntries) {
    const occurrences = expandRecurrence(entry, year, month);
    for (const day of occurrences) {
      expandedRecurring.push({ ...entry, day, _isRecurring: true });
    }
  }


  return [...convertedDirect, ...expandedRecurring];
}


export function expandRecurrence(entry, year, month) {
  if (!entry.recurrence) return [];
  try {
    const dtstart = new Date(Date.UTC(entry.year, entry.month - 1, entry.day || 1));
    const options = RRule.parseString(entry.recurrence);
    const rule = new RRule({ ...options, dtstart });
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    let occurrences = rule.between(start, end, true);

    if (isJulianLayer(entry)) {
      occurrences = occurrences.map(julianDateToGregorian);
    }

    return occurrences.map(occ => occ.getUTCDate());
  } catch {
    return [];
  }
}

export function expandRecurrenceInRange(entry, startYear, startMonth, endYear, endMonth) {
  if (!entry.recurrence) return [];
  try {
    const dtstart = new Date(Date.UTC(entry.year, entry.month - 1, entry.day || 1));
    const options = RRule.parseString(entry.recurrence);
    const rule = new RRule({ ...options, dtstart });
    const start = new Date(Date.UTC(startYear, startMonth - 1, 1));
    const end = new Date(Date.UTC(endYear, endMonth, 1));
    let occurrences = rule.between(start, end, true);

    if (isJulianLayer(entry)) {
      occurrences = occurrences.map(julianDateToGregorian);
    }

    return occurrences;
  } catch {
    return [];
  }
}

export async function createEntry(userId, { layerId, title, description, year, month, day, recurrence, icon, reference, module }) {
  validateEntry({ title, year, month, day, recurrence });

  const layer = await prisma.calendarLayer.findUnique({ where: { id: layerId } });
  if (!layer) {
    const err = new Error('Layer not found.');
    err.status = 404;
    throw err;
  }

  // System layers: only admin can write entries
  if (layer.userId === null) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'admin') {
      const err = new Error('System layer entries are managed by the site owner.');
      err.status = 403;
      throw err;
    }
  } else if (layer.userId !== userId) {
    const share = await prisma.calendarLayerShare.findUnique({
      where: { layerId_userId: { layerId, userId } },
    });
    if (!share || share.role === 'viewer') {
      const err = new Error('Not authorized.');
      err.status = 403;
      throw err;
    }
  }

  return prisma.calendarEntry.create({
    data: {
      layerId,
      title: title.trim(),
                                     description: description?.trim() || null,
                                     year,
                                     month,
                                     day: day || null,
                                     recurrence: recurrence || null,
                                     icon: icon || null,
                                     reference: reference || null,
                                     module: module || null,
    },
  });
}

export async function updateEntry(entryId, userId, { title, description, year, month, day, recurrence, icon, reference, module }) {
  const entry = await prisma.calendarEntry.findUnique({ where: { id: entryId } });
  if (!entry) {
    const err = new Error('Entry not found.');
    err.status = 404;
    throw err;
  }

  const layer = await prisma.calendarLayer.findUnique({ where: { id: entry.layerId } });

  if (layer.userId === null) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'admin') {
      const err = new Error('System layer entries are managed by the site owner.');
      err.status = 403;
      throw err;
    }
  } else if (layer.userId !== userId) {
    const share = await prisma.calendarLayerShare.findUnique({
      where: { layerId_userId: { layerId: entry.layerId, userId } },
    });
    if (!share || share.role === 'viewer') {
      const err = new Error('Not authorized.');
      err.status = 403;
      throw err;
    }
  }

  if (title !== undefined) {
    if (!title.trim()) {
      const err = new Error('Title cannot be empty.');
      err.status = 400;
      throw err;
    }
    if (title.length > MAX_ENTRY_TITLE_LENGTH) {
      const err = new Error(`Title must be ${MAX_ENTRY_TITLE_LENGTH} characters or fewer.`);
      err.status = 400;
      throw err;
    }
  }

  return prisma.calendarEntry.update({
    where: { id: entryId },
    data: {
      ...(title !== undefined && { title: title.trim() }),
                                     ...(description !== undefined && { description: description?.trim() || null }),
                                     ...(year !== undefined && { year }),
                                     ...(month !== undefined && { month }),
                                     ...(day !== undefined && { day: day || null }),
                                     ...(recurrence !== undefined && { recurrence: recurrence || null }),
                                     ...(icon !== undefined && { icon }),
                                     ...(reference !== undefined && { reference }),
                                     ...(module !== undefined && { module }),
    },
  });
}

export async function deleteEntry(entryId, userId) {
  const entry = await prisma.calendarEntry.findUnique({ where: { id: entryId } });
  if (!entry) {
    const err = new Error('Entry not found.');
    err.status = 404;
    throw err;
  }

  const layer = await prisma.calendarLayer.findUnique({ where: { id: entry.layerId } });

  if (layer.userId === null) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'admin') {
      const err = new Error('System layer entries are managed by the site owner.');
      err.status = 403;
      throw err;
    }
  } else if (layer.userId !== userId) {
    const share = await prisma.calendarLayerShare.findUnique({
      where: { layerId_userId: { layerId: entry.layerId, userId } },
    });
    if (!share || share.role === 'viewer') {
      const err = new Error('Not authorized.');
      err.status = 403;
      throw err;
    }
  }

  await prisma.calendarEntry.delete({ where: { id: entryId } });
}

// ─── Sharing ──────────────────────────────────────────────────────────────────

export async function shareLayer(layerId, userId, { targetUsername, role = 'viewer' }) {
  if (role !== 'viewer' && role !== 'editor') {
    const err = new Error('Role must be "viewer" or "editor".');
    err.status = 400;
    throw err;
  }

  const layer = await prisma.calendarLayer.findUnique({ where: { id: layerId } });
  if (!layer) {
    const err = new Error('Layer not found.');
    err.status = 404;
    throw err;
  }

  // System layers are universal — no sharing needed
  if (layer.userId === null) {
    const err = new Error('System layers are available to everyone and cannot be shared.');
    err.status = 400;
    throw err;
  }

  if (layer.userId !== userId) {
    const err = new Error('Layer not found.');
    err.status = 404;
    throw err;
  }

  const target = await prisma.user.findUnique({ where: { username: targetUsername?.trim() || '' } });
  if (!target) {
    const err = new Error(`No user found with username "${targetUsername}".`);
    err.status = 404;
    throw err;
  }
  if (target.id === userId) {
    const err = new Error("You can't share a layer with yourself.");
    err.status = 400;
    throw err;
  }

  const existing = await prisma.calendarLayerShare.findUnique({
    where: { layerId_userId: { layerId, userId: target.id } },
  });
  if (existing) {
    return prisma.calendarLayerShare.update({ where: { id: existing.id }, data: { role } });
  }

  return prisma.calendarLayerShare.create({
    data: { layerId, userId: target.id, role },
  });
}

export async function unshareLayer(layerId, userId, targetUserId) {
  const layer = await prisma.calendarLayer.findUnique({ where: { id: layerId } });
  if (!layer || layer.userId === null) {
    const err = new Error('Layer not found.');
    err.status = 404;
    throw err;
  }
  if (layer.userId !== userId) {
    const err = new Error('Layer not found.');
    err.status = 404;
    throw err;
  }
  await prisma.calendarLayerShare.delete({
    where: { layerId_userId: { layerId, userId: targetUserId } },
  });
}

export async function listLayerShares(layerId, userId) {
  const layer = await prisma.calendarLayer.findUnique({ where: { id: layerId } });
  if (!layer || layer.userId === null) {
    const err = new Error('Layer not found.');
    err.status = 404;
    throw err;
  }
  if (layer.userId !== userId) {
    const err = new Error('Layer not found.');
    err.status = 404;
    throw err;
  }
  const shares = await prisma.calendarLayerShare.findMany({
    where: { layerId },
    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return shares.map((s) => ({
    shareId: s.id,
    userId: s.user.id,
    username: s.user.username,
    displayName: s.user.displayName,
    avatarUrl: s.user.avatarUrl,
    role: s.role,
    sharedAt: s.createdAt,
  }));
}

// ─── Print Config ─────────────────────────────────────────────────────────────

export async function getPrintConfig(userId, year) {
  return prisma.calendarPrintConfig.findFirst({
    where: { userId, year },
  });
}

export async function savePrintConfig(userId, {
  year, layout, paper, orientation, layerIds,
  coverImageId, coverTitle, coverVerseRef, coverVerseText,
  dayBgImageIds, overlayOpacity, showWeekdayHeaders,
}) {
  validatePrintConfig({ year, layout, paper, orientation });

  if (coverTitle && coverTitle.length > MAX_COVER_TITLE_LENGTH) {
    const err = new Error(`Cover title must be ${MAX_COVER_TITLE_LENGTH} characters or fewer.`);
    err.status = 400;
    throw err;
  }

  let resolvedVerseText = coverVerseText;
  if (coverVerseRef && !resolvedVerseText) {
    try {
      const modules = swordService.listInstalledModules('BIBLE');
      const defaultModule = modules[0]?.name;
      if (defaultModule) {
        const verses = swordService.getPassage(defaultModule, coverVerseRef);
        resolvedVerseText = swordService.versesToText(verses);
      }
    } catch {
      resolvedVerseText = null;
    }
  }

  const existing = await prisma.calendarPrintConfig.findFirst({ where: { userId, year } });
  const data = {
    layout: layout || 'single-month',
    paper: paper || 'letter',
    orientation: orientation || 'portrait',
    layerIds: layerIds || [],
    coverImageId: coverImageId || null,
    coverTitle: coverTitle?.trim() || null,
    coverVerseRef: coverVerseRef?.trim() || null,
    coverVerseText: resolvedVerseText?.trim() || null,
    dayBgImageIds: dayBgImageIds || null,
    overlayOpacity: overlayOpacity ?? 0.65,
    showWeekdayHeaders: showWeekdayHeaders ?? true,
  };

  if (existing) {
    return prisma.calendarPrintConfig.update({ where: { id: existing.id }, data });
  }
  return prisma.calendarPrintConfig.create({ data: { userId, year, ...data } });
}

export async function deletePrintConfig(configId, userId) {
  const config = await prisma.calendarPrintConfig.findUnique({ where: { id: configId } });
  if (!config || config.userId !== userId) {
    const err = new Error('Print config not found.');
    err.status = 404;
    throw err;
  }
  await prisma.calendarPrintConfig.delete({ where: { id: configId } });
}

// ─── Hebrew Date Helpers ──────────────────────────────────────────────────────

export function getHebrewDate(gregorianDate) {
  try {
    const hdate = new HDate(gregorianDate);
    return hdate.toString();
  } catch {
    return null;
  }
}

export function getHebrewHolidaysForYear(hebrewYear) {
  try {
    const events = HebrewCalendar.getHolidaysForYearArray(hebrewYear, false);
    return events.map((ev) => ({
      title: ev.getDesc(),
                               gregorianDate: ev.getDate().greg(),
    }));
  } catch {
    return [];
  }
}

export function getHebrewDatesForMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const result = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const hd = new HDate(new Date(year, month - 1, d));
    result[d] = `${hd.getMonthName()} ${hd.getDate()}, ${hd.getFullYear()}`;
  }
  return result;
}

// ─── Nager.Date Proxy (Civil Holidays) ────────────────────────────────────────

const NAGER_BASE = 'https://date.nager.at/api/v3';

export async function getNagerCountries() {
  const res = await fetch(`${NAGER_BASE}/AvailableCountries`);
  if (!res.ok) throw new Error(`Nager.Date error: ${res.status}`);
  const data = await res.json();
  return data.map(c => ({ code: c.countryCode, name: c.name }));
}

export async function getNagerHolidays(year, countryCode) {
  const res = await fetch(`${NAGER_BASE}/PublicHolidays/${year}/${countryCode}`);
  if (!res.ok) throw new Error(`Nager.Date error: ${res.status}`);
  const data = await res.json();
  return data
  .filter(h => h.types && h.types.includes('Public'))
  .map(h => {
    const [y, m, d] = h.date.split('-').map(Number);
    return { year: y, month: m, day: d, title: h.name, localName: h.localName };
  });
}

export async function generateCivilEntries(userId, layerId, year, countryCode) {
  await prisma.calendarEntry.deleteMany({ where: { layerId, year } });

  const holidays = await getNagerHolidays(year, countryCode);
  if (holidays.length === 0) return { created: 0 };

  const entries = holidays.map(h => ({
    layerId,
    title: h.title,
    description: h.localName && h.localName !== h.title ? h.localName : null,
    year: h.year,
    month: h.month,
    day: h.day,
    recurrence: `FREQ=YEARLY;BYMONTH=${h.month};BYMONTHDAY=${h.day}`,
    icon: '🏛️',
  }));

  await prisma.calendarEntry.createMany({ data: entries });
  return { created: entries.length };
}

export async function generateHebrewEntries(userId, layerId, gregYear) {
  await prisma.calendarEntry.deleteMany({ where: { layerId, year: gregYear } });

  const hebYear = gregYear + 3761;     // Tishrei 1 of hebYear falls in gregYear (Sep/Oct)
  const hebYearPrev = gregYear + 3760; // Previous Hebrew year (Nisan 1 falls ~Mar/Apr of gregYear)

  const holidaysThisYear = getHebrewHolidaysForYear(hebYear);
  const holidaysPrevYear = getHebrewHolidaysForYear(hebYearPrev);

  const all = [
    ...holidaysThisYear.filter(h => h.gregorianDate.getFullYear() === gregYear),
    ...holidaysPrevYear.filter(h => h.gregorianDate.getFullYear() === gregYear),
  ];

  if (all.length === 0) return { created: 0 };

  const entries = all.map(h => {
    const d = h.gregorianDate;
    return {
      layerId,
      title: h.title,
      year: gregYear,
      month: d.getMonth() + 1,
                          day: d.getDate(),
                          recurrence: null, // Hebrew dates shift — no RRULE, generate per year
                          icon: '📜',
    };
  });

  await prisma.calendarEntry.createMany({ data: entries });
  return { created: entries.length };
}

// ─── Christian Feasts ─────────────────────────────────────────────────────────

const WESTERN_FIXED = [
  { key: 'epiphany',                title: 'Epiphany',                month: 1,  day: 6,  traditions: ['protestant','catholic','eastern'] },
{ key: 'candlemas',               title: 'Presentation (Candlemas)',month: 2,  day: 2,  traditions: ['protestant','catholic','eastern'] },
{ key: 'annunciation',            title: 'Annunciation',            month: 3,  day: 25, traditions: ['protestant','catholic','eastern'] },
{ key: 'transfiguration',         title: 'Transfiguration',         month: 8,  day: 6,  traditions: ['catholic','eastern'] },
{ key: 'assumption',              title: 'Assumption',              month: 8,  day: 15, traditions: ['catholic','eastern'] },
{ key: 'reformation',             title: 'Reformation Day',         month: 10, day: 31, traditions: ['protestant'] },
{ key: 'all_saints',              title: "All Saints' Day",         month: 11, day: 1,  traditions: ['protestant','catholic','eastern'] },
{ key: 'all_souls',               title: 'All Souls',               month: 11, day: 2,  traditions: ['catholic'] },
{ key: 'immaculate_conception',   title: 'Immaculate Conception',   month: 12, day: 8,  traditions: ['catholic'] },
{ key: 'christmas_eve',           title: 'Christmas Eve',           month: 12, day: 24, traditions: ['protestant','catholic','eastern'] },
{ key: 'christmas',               title: 'Christmas',               month: 12, day: 25, traditions: ['protestant','catholic','eastern'] },
{ key: 'boxing_day',              title: 'Boxing Day',              month: 12, day: 26, traditions: ['catholic'] },
];

// Anonymous Gregorian algorithm — returns Easter Sunday as { month, day }
export function westernEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

// Returns [{ key, title, month, day, traditions }] for movable feasts in a given year
export function getWesternMovableFeasts(year) {
  const easter = westernEaster(year);
  const easterDate = new Date(Date.UTC(year, easter.month - 1, easter.day));

  const offsets = [
    { key: 'ash_wednesday',  title: 'Ash Wednesday',   offset: -46, traditions: ['protestant','catholic'] },
    { key: 'palm_sunday',    title: 'Palm Sunday',     offset: -7,  traditions: ['protestant','catholic','eastern'] },
    { key: 'good_friday',    title: 'Good Friday',     offset: -2,  traditions: ['protestant','catholic','eastern'] },
    { key: 'holy_saturday',  title: 'Holy Saturday',   offset: -1,  traditions: ['protestant','catholic','eastern'] },
    { key: 'easter',         title: 'Easter',          offset: 0,   traditions: ['protestant','catholic','eastern'] },
    { key: 'ascension',      title: 'Ascension',       offset: 39,  traditions: ['protestant','catholic','eastern'] },
    { key: 'pentecost',      title: 'Pentecost',       offset: 49,  traditions: ['protestant','catholic','eastern'] },
    { key: 'trinity',        title: 'Trinity Sunday',  offset: 56,  traditions: ['protestant','catholic','eastern'] },
    { key: 'corpus_christi', title: 'Corpus Christi',  offset: 60,  traditions: ['catholic'] },
  ];

  return offsets.map(o => {
    const d = new Date(easterDate.getTime() + o.offset * 86400000);
    return {
      key: o.key,
      title: o.title,
      month: d.getUTCMonth() + 1,
                     day: d.getUTCDate(),
                     traditions: o.traditions,
    };
  });
}

const EASTERN_FIXED = [
  { key: 'theophany',             title: 'Theophany',             month: 1,  day: 19, traditions: ['eastern'] },
{ key: 'meekness',              title: 'Sunday of the Praise of the Cross', month: 3, day: 1, traditions: ['eastern'] },
{ key: 'annunciation',          title: 'Annunciation',          month: 3,  day: 25, traditions: ['eastern'] },
{ key: 'transfiguration',       title: 'Transfiguration',       month: 8,  day: 19, traditions: ['eastern'] },
{ key: 'dormition',             title: 'Dormition of the Theotokos', month: 8, day: 28, traditions: ['eastern'] },
{ key: 'nativity',              title: 'Nativity (Christmas)',  month: 1,  day: 7,  traditions: ['eastern'] },
{ key: 'circumcision',          title: 'Circumcision (St. Basil)', month: 1, day: 14, traditions: ['eastern'] },
];

// Julian computus — same algorithm as westernEaster but the result is a Julian date.
// We add 13 days to convert to Gregorian (valid 1900–2099).
export function easternEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return { month, day }; // Julian date — conversion happens on read
}

export function getEasternMovableFeasts(year) {
  const easter = easternEaster(year);
  const easterDate = new Date(Date.UTC(year, easter.month - 1, easter.day));

  const offsets = [
    { key: 'cheesefare',     title: 'Cheese Fare Sunday',   offset: -48, traditions: ['eastern'] },
    { key: 'palm_sunday',    title: 'Palm Sunday',          offset: -7,  traditions: ['eastern'] },
    { key: 'good_friday',    title: 'Great Friday',         offset: -2,  traditions: ['eastern'] },
    { key: 'easter',         title: 'Pascha (Easter)',      offset: 0,   traditions: ['eastern'] },
    { key: 'easter_monday',  title: 'Easter Monday',        offset: 1,   traditions: ['eastern'] },
    { key: 'orthros',        title: 'Thomas Sunday',        offset: 7,   traditions: ['eastern'] },
    { key: 'myron',          title: 'Myron Sunday',         offset: 14,  traditions: ['eastern'] },
    { key: 'rapture',        title: 'Rapture Sunday',       offset: 21,  traditions: ['eastern'] },
    { key: 'exaltation',     title: 'Exaltation Sunday',    offset: 28,  traditions: ['eastern'] },
    { key: 'rodes',          title: 'Rodes Sunday',         offset: 35,  traditions: ['eastern'] },
    { key: 'ascension',      title: 'Ascension',            offset: 39,  traditions: ['eastern'] },
    { key: 'pentecost',      title: 'Pentecost (Trinity)',  offset: 49,  traditions: ['eastern'] },
    { key: 'all_saints',     title: 'All Saints',           offset: 56,  traditions: ['eastern'] },
  ];

  return offsets.map(o => {
    const d = new Date(easterDate.getTime() + o.offset * 86400000);
    return {
      key: o.key,
      title: o.title,
      month: d.getUTCMonth() + 1,
                     day: d.getUTCDate(),
                     traditions: o.traditions,
    };
  });
}

// Returns all feasts (fixed + movable) for a given year and tradition
export function getAllFeasts(year, tradition) {
  if (tradition === 'western') {
    return [...WESTERN_FIXED, ...getWesternMovableFeasts(year)];
  }
  if (tradition === 'eastern') {
    return [...EASTERN_FIXED, ...getEasternMovableFeasts(year)];
  }
  return [];
}

// Presets for the gear button quick-select
const CHRISTIAN_PRESETS = {
  all: {
    label: 'All Holidays',
    keys: null,
  },
  protestant: {
    label: 'Protestant',
    keys: null,
  },
  catholic: {
    label: 'Catholic',
    keys: null,
  },
  eastern_orthodox: {
    label: 'Eastern Orthodox',
    keys: null,
  },
  christmas_easter: {
    label: 'Christmas + Easter',
    keys: ['christmas_eve','christmas','easter','good_friday','holy_saturday','palm_sunday'],
  },
};

// Returns the list of keys for a preset given a tradition
export function getPresetKeys(presetName, tradition, year) {
  const all = getAllFeasts(year, tradition);
  if (presetName === 'all') return all.map(f => f.key);
  if (presetName === 'protestant') return all.filter(f => f.traditions.includes('protestant')).map(f => f.key);
  if (presetName === 'catholic') return all.filter(f => f.traditions.includes('catholic')).map(f => f.key);
  if (presetName === 'eastern_orthodox') return all.filter(f => f.traditions.includes('eastern')).map(f => f.key);
  if (presetName === 'christmas_easter') return CHRISTIAN_PRESETS.christmas_easter.keys;
  return [];
}

export async function generateChristianEntries(userId, layerId, year, tradition, enabledKeys) {
  await prisma.calendarEntry.deleteMany({ where: { layerId, year } });

  const allFeasts = getAllFeasts(year, tradition);
  const feasts = enabledKeys
  ? allFeasts.filter(f => enabledKeys.includes(f.key))
  : allFeasts;

  if (feasts.length === 0) return { created: 0 };

  const entries = feasts.map(f => ({
    layerId,
    title: f.title,
    year,
    month: f.month,
    day: f.day,
    recurrence: null, // movable feasts shift; regenerate per year
    icon: '✝️',
  }));

  await prisma.calendarEntry.createMany({ data: entries });
  return { created: entries.length };
}

// ─── Uploads ──────────────────────────────────────────────────────────────────

export function getCalendarImageUrl(subdir, filename) {
  return `/uploads/calendar/${subdir}/${filename}`;
}

// ─── Layer Range Entries ──────────────────────────────────────────────────────

export async function listEntriesForLayerInRange(layerId, startYear, startMonth, endYear, endMonth) {
  const monthsInRange = [];
  let y = startYear, m = startMonth;
  while (y < endYear || (y === endYear && m < endMonth)) {
    monthsInRange.push({ year: y, month: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }

  const all = await prisma.calendarEntry.findMany({
    where: { layerId },
    include: { layer: true },
  });

  const inRange = [];
  for (const e of all) {
    if (e.recurrence) {
      const occurrences = expandRecurrenceInRange(e, startYear, startMonth, endYear, endMonth);
      for (const date of occurrences) {
        inRange.push({
          ...e,
          year: date.getUTCFullYear(),
                     month: date.getUTCMonth() + 1,
                     day: date.getUTCDate(),
                     _isRecurring: true,
        });
      }
    } else {
      if (monthsInRange.some(({ year, month }) => year === e.year && month === e.month)) {
        if (isJulianLayer(e) && e.day) {
          const g = julianToGregorian(e.year, e.month, e.day);
          inRange.push({ ...e, year: g.year, month: g.month, day: g.day });
        } else {
          inRange.push(e);
        }
      }
    }
  }

  inRange.sort((a, b) =>
  (a.year - b.year) || (a.month - b.month) || ((a.day || 0) - (b.day || 0))
  );

  return inRange.map(e => ({
    id: e.id,
    title: e.title,
    year: e.year,
    month: e.month,
    day: e.day,
    layerId: e.layerId,
    layerColor: e.layer?.color || '#888',
    recurrence: e.recurrence || null,
    _isRecurring: e._isRecurring || false,
  }));
}
