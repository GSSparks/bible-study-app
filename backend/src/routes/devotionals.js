import { Router } from 'express';
import { requireLogin, requireAdmin } from '../middleware/auth.js';
import { listDevotionalModules, getTodaysDevotional, setActiveModule, getActiveModule } from '../services/devotionalService.js';
import { swordService } from '../services/swordService.js';

export const devotionalsRouter = Router();
devotionalsRouter.use(requireLogin);

devotionalsRouter.get('/today', async (req, res, next) => {
  try {
    res.json(await getTodaysDevotional());
  } catch (err) {
    next(err);
  }
});

devotionalsRouter.get('/modules', (req, res) => {
  res.json(listDevotionalModules());
});

// Admin-only: dump the first N raw keys for a devotional module so key
// format issues can be diagnosed without reading server logs.
devotionalsRouter.get('/debug', requireAdmin, async (req, res) => {
  const moduleCode = req.query.module || await getActiveModule();
  if (!moduleCode) return res.json({ error: 'No active devotional module' });
  try {
    const keys = swordService.getDictionaryKeys(moduleCode);
    res.json({ moduleCode, total: keys.length, sample: keys.slice(0, 40) });
  } catch (e) {
    res.json({ moduleCode, error: e.message, total: 0, sample: [] });
  }
});

devotionalsRouter.post('/settings', requireAdmin, async (req, res, next) => {
  try {
    const { moduleCode } = req.body;
    if (!moduleCode) return res.status(400).json({ error: 'moduleCode is required' });
    await setActiveModule(moduleCode);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
