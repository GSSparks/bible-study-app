// backend/src/services/calendarService.js

import { prisma } from '../db/prisma.js';
import { swordService } from './swordService.js';
import { HebrewCalendar, HDate, months } from '@hebcal/core';
import rrule from 'rrule';

const { RRule } = rrule;
const MAX_LAYER_NAME_LENGTH = 60;
const MAX_ENTRY_TITLE_LENGTH = 120;
const MAX_ENTRY_DESCRIPTION_LENGTH = 500;
const MAX_COVER_TITLE_LENGTH = 80;
const MAX_COVER_VERSE_REF_LENGTH = 50;

// ─── Validation ───────────────────────────────────────────────────────────────

function validateLayer({ name, color, calendarSystem }) {
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
  if (calendarSystem !== 'gregorian' && calendarSystem !== 'hebrew') {
    const err = new Error('calendarSystem must be "gregorian" or "hebrew".');
    err.status = 400;
    throw err;
  }
}

function validateEntry({ title, year, month, day, recurrence }) {
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

function validatePrintConfig({ year, layout, paper, orientation }) {
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
  { name: 'Christian Liturgical', color: '#E8A441', calendarSystem: 'gregorian' },
  { name: 'Hebrew', color: '#3F7168', calendarSystem: 'hebrew' },
  { name: 'Civil', color: '#8B8FA3', calendarSystem: 'gregorian' },
];

/** Ensures the user has the three built-in layers. Called lazily on first
 *  calendar access — idempotent, safe to call on every request. */
export async function listLayers(userId) {
    await ensureBuiltInLayers(userId);

    const [owned, shared] = await Promise.all([
        prisma.calendarLayer.findMany({
            where: { userId },
            orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'asc' }],
        }),
        prisma.calendarLayerShare.findMany({
            where: { userId },
            include: { layer: true },
        }),
    ]);

// ─── Layer CRUD ───────────────────────────────────────────────────────────────

/** All layers visible to this user: their own + shared-with-them.
 *  Built-in layers are seeded on first call. */

  return [
    ...owned.map((l) => ({ ...l, shared: false, sharedBy: null })),
    ...shared.map((s) => ({
      ...s.layer,
      shared: true,
      sharedBy: s.user?.displayName || s.user?.username || 'unknown',
      myShareRole: s.role,
    })),
  ];
}

export async function createLayer(userId, { name, color, calendarSystem = 'gregorian' }) {
  validateLayer({ name, color, calendarSystem });
  await ensureBuiltInLayers(userId);
  return prisma.calendarLayer.create({
    data: { name: name.trim(), color, calendarSystem, userId },
  });
}

export async function updateLayer(layerId, userId, { name, color, visible }) {
  const layer = await prisma.calendarLayer.findUnique({ where: { id: layerId } });
  if (!layer || layer.userId !== userId) {
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
  if (!layer || layer.userId !== userId) {
    const err = new Error('Layer not found.');
    err.status = 404;
    throw err;
  }
  if (layer.isBuiltIn) {
    const err = new Error('Built-in layers cannot be deleted — hide them instead.');
    err.status = 400;
    throw err;
  }
  await prisma.calendarLayer.delete({ where: { id: layerId } }); // cascades entries + shares
}

// ─── Entry CRUD ───────────────────────────────────────────────────────────────

/** All entries for a given month, across the user's visible layers.
 *  Returns a flat array with layer info attached for rendering. */
export async function listEntriesForMonth(userId, year, month) {
  await ensureBuiltInLayers(userId);

  // Get all layers the user can see (owned + shared)
  const [ownedLayers, sharedShares] = await Promise.all([
    prisma.calendarLayer.findMany({ where: { userId, visible: true } }),
    prisma.calendarLayerShare.findMany({
      where: { userId },
      include: { layer: { where: { visible: true } } },
    }),
  ]);

  const allLayers = [
    ...ownedLayers,
    ...sharedShares.filter((s) => s.layer).map((s) => s.layer),
  ];
  const layerIds = allLayers.map((l) => l.id);

  if (layerIds.length === 0) return [];

  // Fetch non-recurring entries for this month
  const directEntries = await prisma.calendarEntry.findMany({
    where: {
      layerId: { in: layerIds },
      year,
      month,
      recurrence: null,
    },
    include: { layer: { select: { id: true, name: true, color: true } } },
    orderBy: { day: 'asc' },
  });

  // Fetch recurring entries and expand them for this month
  const recurringEntries = await prisma.calendarEntry.findMany({
    where: {
      layerId: { in: layerIds },
      year,
      recurrence: { not: null },
    },
    include: { layer: { select: { id: true, name: true, color: true } } },
  });

  const expandedRecurring = [];
  for (const entry of recurringEntries) {
    const occurrences = expandRecurrence(entry, year, month);
    for (const day of occurrences) {
      expandedRecurring.push({ ...entry, day, _isRecurring: true });
    }
  }

  return [...directEntries, ...expandedRecurring];
}

/** Expands an RRULE string into the set of days in the given month
 *  where the recurrence fires. Returns an array of day numbers. */
function expandRecurrence(entry, year, month) {
  if (!entry.recurrence) return [];
  try {
    const rrule = RRule.parseString(entry.recurrence);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1)); // first day of next month
    const occurrences = rrule.all();
    // RRule.all() can be infinite — cap it by filtering to our range
    const days = [];
    for (const occ of occurrences) {
      if (occ >= end) break;
      if (occ >= start) {
        days.push(occ.getUTCDate());
      }
    }
    return days;
  } catch {
    return []; // malformed RRULE — skip silently
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

  // Permission: owner can always write; shared-as-editor can write; shared-as-viewer cannot
  if (layer.userId !== userId) {
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
  if (layer.userId !== userId) {
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
      ...(icon !== undefined && { icon: icon || null }),
      ...(reference !== undefined && { reference: reference || null }),
      ...(module !== undefined && { module: module || null }),
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
  if (layer.userId !== userId) {
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
  if (!layer || layer.userId !== userId) {
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
  if (!layer || layer.userId !== userId) {
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
  if (!layer || layer.userId !== userId) {
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

  // Resolve verse text from SWORD if a reference is provided but no cached text
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
      resolvedVerseText = null; // verse ref is invalid or no modules installed
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

/** Returns the Hebrew date string for a given Gregorian date,
 *  e.g. "15 Cheshvan 5787". Used in the month header. */
export function getHebrewDate(gregorianDate) {
    try {
        const hdate = new HDate(gregorianDate);
        return hdate.toString(); // e.g. "26 Cheshvan 5787"
    } catch {
        return null;
    }
}
/** Returns all Hebrew holidays for a given Hebrew year as an array of
 *  { title, gregorianDate } objects. Used for seeding the built-in Hebrew layer. */
export function getHebrewHolidaysForYear(hebrewYear) {
    try {
        const events = HebrewCalendar.getHolidaysForYearArray(hebrewYear, false);
        return events.map((ev) => ({
            title: ev.getDesc(),
                                   gregorianDate: ev.getDate().greg(), // JS Date object
        }));
    } catch {
        return [];
    }
}
// ─── Uploads (Calendar-Specific) ──────────────────────────────────────────────

/** Upload endpoint for cover images and day background images.
 *  Reuses the same UPLOADS_PATH pattern as the existing uploads router.
 *  The route handler in calendar.js will use multer middleware
 *  (similar to uploadBanner) and call this to persist the URL. */
export function getCalendarImageUrl(subdir, filename) {
  return `/uploads/calendar/${subdir}/${filename}`;
}
