import { Router } from 'express';
import { requireLogin } from '../middleware/auth.js';
import {
  listPlans,
  getPlan,
  getUserProgress,
  markDayComplete,
  markDayIncomplete,
} from '../services/readingPlanService.js';

export const readingPlansRouter = Router();

readingPlansRouter.get('/', async (req, res, next) => {
  try {
    res.json(await listPlans());
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

readingPlansRouter.delete('/:id/progress/:dayNumber', requireLogin, async (req, res, next) => {
  try {
    await markDayIncomplete(req.user.id, req.params.id, Number(req.params.dayNumber));
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
