import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { getBrandName, setBrandName } from '../services/brandingService.js';

export const brandingRouter = Router();

// GET /api/branding — public. Anonymous visitors need this too, to
// render the sidebar with the right name.
brandingRouter.get('/', async (req, res, next) => {
  try {
    res.json({ name: await getBrandName() });
  } catch (err) {
    next(err);
  }
});

// POST /api/branding  { name } — admin-only.
brandingRouter.post('/', requireAdmin, async (req, res, next) => {
  try {
    const name = await setBrandName(req.body.name);
    res.json({ name });
  } catch (err) {
    next(err);
  }
});