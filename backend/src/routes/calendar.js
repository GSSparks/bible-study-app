// backend/src/routes/calendar.js

import { Router } from 'express';
import { requireLogin, requireAdmin } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadCalendarImage } from '../middleware/upload.js';
import {
  listLayers,
  createLayer,
  updateLayer,
  deleteLayer,
  getHebrewDatesForMonth,
  listEntriesForMonth,
  listEntriesForLayerInRange,
  createEntry,
  updateEntry,
  deleteEntry,
  shareLayer,
  unshareLayer,
  listLayerShares,
  getPrintConfig,
  savePrintConfig,
  deletePrintConfig,
  listDayImages,
  setDayImage,
  removeDayImage,
  listDayBgFiles,
  deleteDayBgFile,
  listFontFiles,
  deleteFontFile,
  getPresetKeys,
} from '../services/calendarService.js';


export const calendarRouter = Router();

calendarRouter.use(requireLogin);

// ─── Layers ───────────────────────────────────────────────────────────────────

calendarRouter.get('/layers', async (req, res, next) => {
  try {
    res.json(await listLayers(req.user.id));
  } catch (err) {
    next(err);
  }
});

calendarRouter.post('/layers', async (req, res, next) => {
  try {
    const { name, color, calendarSystem } = req.body;
    res.status(201).json(await createLayer(req.user.id, { name, color, calendarSystem }));
  } catch (err) {
    next(err);
  }
});

calendarRouter.put('/layers/:id', async (req, res, next) => {
  try {
    const { name, color, visible } = req.body;
    res.json(await updateLayer(req.params.id, req.user.id, { name, color, visible }));
  } catch (err) {
    next(err);
  }
});

calendarRouter.delete('/layers/:id', async (req, res, next) => {
  try {
    await deleteLayer(req.params.id, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ─── Layer Sharing ────────────────────────────────────────────────────────────

calendarRouter.get('/layers/:id/shares', async (req, res, next) => {
  try {
    res.json(await listLayerShares(req.params.id, req.user.id));
  } catch (err) {
    next(err);
  }
});

calendarRouter.post('/layers/:id/share', async (req, res, next) => {
  try {
    const { username, role } = req.body;
    if (!username) return res.status(400).json({ error: 'username is required' });
    res.status(201).json(await shareLayer(req.params.id, req.user.id, { targetUsername: username, role }));
  } catch (err) {
    next(err);
  }
});

calendarRouter.delete('/layers/:id/share/:userId', async (req, res, next) => {
  try {
    await unshareLayer(req.params.id, req.user.id, req.params.userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ─── Entries ──────────────────────────────────────────────────────────────────

calendarRouter.get('/entries/:year/:month', async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const userId = req.user.id;
    const entries = await listEntriesForMonth(userId, +year, +month);
    const hebrewDates = getHebrewDatesForMonth(+year, +month);
    res.json({ entries, hebrewDates });
  } catch (err) {
    next(err);
  }
});

calendarRouter.post('/entries', async (req, res, next) => {
  try {
    const { layerId, title, description, year, month, day, recurrence, icon, reference, module } = req.body;
    res.status(201).json(await createEntry(req.user.id, { layerId, title, description, year, month, day, recurrence, icon, reference, module }));
  } catch (err) {
    next(err);
  }
});

calendarRouter.put('/entries/:id', async (req, res, next) => {
  try {
    const { title, description, year, month, day, recurrence, icon, reference, module } = req.body;
    res.json(await updateEntry(req.params.id, req.user.id, { title, description, year, month, day, recurrence, icon, reference, module }));
  } catch (err) {
    next(err);
  }
});

calendarRouter.delete('/entries/:id', async (req, res, next) => {
  try {
    await deleteEntry(req.params.id, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ─── Print Config ─────────────────────────────────────────────────────────────

calendarRouter.get('/print-config/:year', async (req, res, next) => {
  try {
    const year = parseInt(req.params.year, 10);
    if (isNaN(year)) return res.status(400).json({ error: 'Valid year required.' });
    const config = await getPrintConfig(req.user.id, year);
    res.json(config || null);
  } catch (err) {
    next(err);
  }
});

calendarRouter.put('/print-config/:year', async (req, res, next) => {
  try {
    const year = parseInt(req.params.year, 10);
    if (isNaN(year)) return res.status(400).json({ error: 'Valid year required.' });
    const {
      layout, paper, orientation, layerIds,
      coverImageId, coverTitle, coverVerseRef, coverVerseText,
      dayBgImageIds, overlayOpacity, showWeekdayHeaders,
    } = req.body;
    res.json(await savePrintConfig(req.user.id, { year, layout, paper, orientation, layerIds, coverImageId, coverTitle, coverVerseRef, coverVerseText, dayBgImageIds, overlayOpacity, showWeekdayHeaders }));
  } catch (err) {
    next(err);
  }
});

calendarRouter.delete('/print-config/:year', async (req, res, next) => {
  try {
    const year = parseInt(req.params.year, 10);
    if (isNaN(year)) return res.status(400).json({ error: 'Valid year required.' });
    const config = await getPrintConfig(req.user.id, year);
    if (!config) return res.status(404).json({ error: 'Print config not found.' });
    await deletePrintConfig(config.id, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ─── Calendar Image Uploads ───────────────────────────────────────────────────

calendarRouter.post('/images/:subdir', uploadCalendarImage, (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const subdir = req.params.subdir === 'day-bg' ? 'day-bg' : 'cover';
    const url = `/uploads/calendar/${subdir}/${req.file.filename}`;
    res.status(201).json({ url });
  } catch (err) {
    next(err);
  }
});

// calendar.js routes
calendarRouter.get('/layers/:id/entries', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startYear, startMonth, endYear, endMonth } = req.query;
    const entries = await listEntriesForLayerInRange(
      id,
      parseInt(startYear, 10), parseInt(startMonth, 10),
                                                     parseInt(endYear, 10), parseInt(endMonth, 10),
    );
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

// ─── Day Images ─────────────────────────────────────────────────────────────

calendarRouter.get('/day-images/:year/:month', async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const images = await listDayImages(req.user.id, +year, +month);
    res.json(images);
  } catch (err) {
    next(err);
  }
});

calendarRouter.put('/day-images/:year/:month/:day', async (req, res, next) => {
  try {
    const { year, month, day } = req.params;
    const { imageUrl, layerId } = req.body;
    if (!imageUrl || !layerId) return res.status(400).json({ error: 'imageUrl and layerId are required' });
    await setDayImage(req.user.id, { year: +year, month: +month, day: +day, imageUrl, layerId });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

calendarRouter.delete('/day-images/:year/:month/:day', async (req, res, next) => {
  try {
    const { year, month, day } = req.params;
    const { layerId } = req.query;
    await removeDayImage(req.user.id, +year, +month, +day, layerId || null);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// List available day-bg images for the selector
calendarRouter.get('/images/day-bg', (req, res) => {
  const files = listDayBgFiles();
  res.json(files.map(f => `/uploads/calendar/day-bg/${f}`));
});

calendarRouter.delete('/images/day-bg/:filename', requireAdmin, (req, res) => {
  deleteDayBgFile(req.params.filename);
  res.json({ ok: true });
});
const fontUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads'), 'calendar', 'fonts');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, safe);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (/\.(ttf|otf|woff2?)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('Only TTF, OTF, WOFF, WOFF2 files allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

calendarRouter.get('/fonts', (req, res) => {
  const files = listFontFiles();
  res.json(files.map(f => ({
    filename: f,
    family: f.replace(/\.(ttf|otf|woff2?)$/i, '').replace(/[-_]/g, ' '),
                           url: `/uploads/calendar/fonts/${f}`,
  })));
});

calendarRouter.post('/fonts', requireAdmin, fontUpload.single('font'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({
    filename: req.file.filename,
    family: req.file.filename.replace(/\.(ttf|otf|woff2?)$/i, '').replace(/[-_]/g, ' '),
           url: `/uploads/calendar/fonts/${req.file.filename}`,
  });
});

calendarRouter.delete('/fonts/:filename', requireAdmin, (req, res) => {
  deleteFontFile(req.params.filename);
  res.json({ ok: true });
});

// ─── Layer Config ─────────────────────────────────────────────────────────────

calendarRouter.get('/layers/:id/config', async (req, res, next) => {
  try {
    const { id: layerId } = req.params;
    const userId = req.user.id;
    const { prisma } = await import('../db/prisma.js');
    const config = await prisma.userLayerConfig.findUnique({
      where: { userId_layerId: { userId, layerId } },
    });
    res.json(config?.config ?? null);
  } catch (e) { next(e); }
});

calendarRouter.put('/layers/:id/config', async (req, res, next) => {
  try {
    const { id: layerId } = req.params;
    const userId = req.user.id;
    const { config } = req.body;
    const { prisma } = await import('../db/prisma.js');
    const result = await prisma.userLayerConfig.upsert({
      where: { userId_layerId: { userId, layerId } },
      update: { config },
      create: { userId, layerId, config },
    });
    res.json(result.config);
  } catch (e) { next(e); }
});

calendarRouter.get('/countries', async (req, res, next) => {
  try {
    const { getNagerCountries } = await import('../services/calendarService.js');
    const countries = await getNagerCountries();
    res.json(countries);
  } catch (e) { next(e); }
});

calendarRouter.post('/layers/:id/generate', requireAdmin, async (req, res, next) => {
  try {
    const { id: layerId } = req.params;
    const userId = req.user.id;
    const { year, country, enabledHolidays } = req.body;

    const { prisma } = await import('../db/prisma.js');
    const layer = await prisma.calendarLayer.findUnique({ where: { id: layerId } });
    if (!layer || layer.userId !== null) {
      const err = new Error('Only system layers can be generated.');
      err.status = 400;
      throw err;
    }

    const { generateCivilEntries, generateHebrewEntries, generateChristianEntries } =
    await import('../services/calendarService.js');

    let result;
    if (layer.name === 'Civil') {
      if (!country) {
        const err = new Error('country is required for Civil layer.');
        err.status = 400;
        throw err;
      }
      result = await generateCivilEntries(userId, layerId, year, country);
    } else if (layer.name === 'Hebrew') {
      result = await generateHebrewEntries(userId, layerId, year);
    } else if (layer.name === 'Western Christian' || layer.name === 'Eastern Christian') {
      const tradition = layer.name === 'Western Christian' ? 'western' : 'eastern';
      result = await generateChristianEntries(userId, layerId, year, tradition, enabledHolidays);
    } else {
      const err = new Error('Unknown system layer.');
      err.status = 400;
      throw err;
    }

    res.json(result);
  } catch (e) { next(e); }
});

calendarRouter.get('/feasts/:tradition/:year', async (req, res, next) => {
  try {
    const { getAllFeasts, getPresetKeys } = await import('../services/calendarService.js');
    const { tradition, year } = req.params;
    const { preset } = req.query;

    if (preset) {
      const keys = getPresetKeys(preset, tradition, Number(year));
      return res.json({ keys });
    }
    const feasts = getAllFeasts(Number(year), tradition);
    res.json(feasts);
  } catch (e) { next(e); }
});

export default calendarRouter;
