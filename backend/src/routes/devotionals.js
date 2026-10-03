import { Router } from 'express';
import { requireLogin, requireAdmin } from '../middleware/auth.js';
import { listDevotionalModules, getTodaysDevotional, setActiveModule } from '../services/devotionalService.js';

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
