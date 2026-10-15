import { Router } from 'express';
import { requireLogin, requireAdmin } from '../middleware/auth.js';
import {
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  getUserProgress,
  markDayComplete,
  markDayIncomplete,
  resetUserProgress,
} from '../services/readingPlanService.js';

export const readingPlansRouter = Router();

readingPlansRouter.get('/', async (req, res, next) => {
  try {
    res.json(await listPlans());
  } catch (e) {
    next(e);
  }
});

readingPlansRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { name, description, schedule } = req.body;
    if (!name || !Array.isArray(schedule)) {
      return res.status(400).json({ error: 'name and schedule are required' });
    }
    const plan = await createPlan({ name, description, schedule });
    res.status(201).json(plan);
  } catch (e) {
    next(e);
  }
});

readingPlansRouter.get('/:id', async (req, res, next) => {
  try {
    res.json(await getPlan(req.params.id));
  } catch (e) {
    next(e);
  }
});

readingPlansRouter.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { name, description, schedule } = req.body;
    const plan = await updatePlan(req.params.id, { name, description, schedule });
    res.json(plan);
  } catch (e) {
    if (e.status === 403) return res.status(403).json({ error: e.message });
    next(e);
  }
});

readingPlansRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    await deletePlan(req.params.id);
    res.status(204).end();
  } catch (e) {
    if (e.status === 403) return res.status(403).json({ error: e.message });
    next(e);
  }
});

readingPlansRouter.get('/:id/progress', requireLogin, async (req, res, next) => {
  try {
    const completed = await getUserProgress(req.user.id, req.params.id);
    res.json({ completedDays: completed });
  } catch (e) {
    next(e);
  }
});

readingPlansRouter.post('/:id/progress', requireLogin, async (req, res, next) => {
  try {
    const { dayNumber } = req.body;
    await markDayComplete(req.user.id, req.params.id, Number(dayNumber));
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

readingPlansRouter.delete('/:id/progress', requireLogin, async (req, res, next) => {
  try {
    await resetUserProgress(req.user.id, req.params.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

readingPlansRouter.delete('/:id/progress/:dayNumber', requireLogin, async (req, res, next) => {
  try {
    await markDayIncomplete(req.user.id, req.params.id, Number(req.params.dayNumber));
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
