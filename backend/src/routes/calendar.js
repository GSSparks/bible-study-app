// backend/src/routes/calendar.js

import { Router } from 'express';
import { requireLogin } from '../middleware/auth.js';
import { uploadCalendarImage } from '../middleware/upload.js';
import {
  listLayers,
  createLayer,
  updateLayer,
  deleteLayer,
  listEntriesForMonth,
  createEntry,
  updateEntry,
  deleteEntry,
  shareLayer,
  unshareLayer,
  listLayerShares,
  getPrintConfig,
  savePrintConfig,
  deletePrintConfig,
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
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Valid year and month (1–12) required.' });
    }
    res.json(await listEntriesForMonth(req.user.id, year, month));
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
