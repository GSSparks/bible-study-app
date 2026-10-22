import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { getBrandName, setBrandName, getSiteUrl, setSiteUrl } from '../services/brandingService.js';

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

// GET /api/branding/settings — admin-only. Returns all configurable settings.
brandingRouter.get('/settings', requireAdmin, async (req, res, next) => {
  try {
    const [name, siteUrl] = await Promise.all([getBrandName(), getSiteUrl()]);
    res.json({ name, siteUrl });
  } catch (err) {
    next(err);
  }
});

// POST /api/branding/settings  { name?, siteUrl? } — admin-only.
brandingRouter.post('/settings', requireAdmin, async (req, res, next) => {
  try {
    const { name, siteUrl } = req.body;
    const results = {};
    if (name !== undefined) results.name = await setBrandName(name);
    if (siteUrl !== undefined) results.siteUrl = await setSiteUrl(siteUrl);
    res.json(results);
  } catch (err) {
    next(err);
  }
});