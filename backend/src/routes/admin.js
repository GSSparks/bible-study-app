import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { getDbHealth, getUserMetrics, getContentMetrics } from '../services/metricsService.js';
import { listVisibilityOverrides, setModuleAvailability } from '../services/moduleVisibilityService.js';
import { swordService } from '../services/swordService.js';

export const adminRouter = Router();

// Everything here is admin-only, for the whole router — same reasoning
// as context.js/wordStudy.js gating themselves entirely rather than
// per-route: nothing added here later can accidentally end up
// unprotected by forgetting its own requireAdmin call.
adminRouter.use(requireAdmin);

// GET /api/admin/metrics
adminRouter.get('/metrics', async (req, res, next) => {
  try {
    const [dbHealth, users, content] = await Promise.all([getDbHealth(), getUserMetrics(), getContentMetrics()]);
    res.json({ dbHealth, users, content });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/modules/visibility?type=BIBLE|COMMENTARY|DICT
// Every installed module of the given type, merged with its current
// visibility state — modules never explicitly toggled show as
// available (the implicit default), matching how
// moduleVisibilityService actually resolves availability elsewhere.
adminRouter.get('/modules/visibility', async (req, res, next) => {
  try {
    const type = req.query.type || 'BIBLE';
    const [installed, overrides] = await Promise.all([
      swordService.listInstalledModules(type),
      listVisibilityOverrides(),
    ]);
    const overrideMap = new Map(overrides.map((o) => [o.moduleCode, o.availableToUsers]));
    const result = installed.map((m) => ({
      name: m.name,
      description: m.description,
      availableToUsers: overrideMap.has(m.name) ? overrideMap.get(m.name) : true,
    }));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/modules/:moduleCode/visibility  { availableToUsers: bool }
adminRouter.post('/modules/:moduleCode/visibility', async (req, res, next) => {
  try {
    const { availableToUsers } = req.body;
    if (typeof availableToUsers !== 'boolean') {
      return res.status(400).json({ error: 'availableToUsers must be a boolean' });
    }
    const result = await setModuleAvailability(req.params.moduleCode, availableToUsers);
    res.json(result);
  } catch (err) {
    next(err);
  }
});