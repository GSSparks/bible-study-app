import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { getBrandName, setBrandName, getSiteUrl, setSiteUrl, getLogoUrl, setLogoUrl, removeLogoUrl, getTheme, setTheme } from '../services/brandingService.js';
import { uploadLogo } from '../middleware/upload.js';

export const brandingRouter = Router();

// GET /api/branding — public. Anonymous visitors need this too, to
// render the sidebar with the right name.
brandingRouter.get('/', async (req, res, next) => {
  try {
    const [name, logoUrl, theme] = await Promise.all([getBrandName(), getLogoUrl(), getTheme()]);
    res.json({ name, logoUrl, theme });
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
    const [name, siteUrl, logoUrl, theme] = await Promise.all([getBrandName(), getSiteUrl(), getLogoUrl(), getTheme()]);
    res.json({ name, siteUrl, logoUrl, theme });
  } catch (err) {
    next(err);
  }
});

// POST /api/branding/settings  { name?, siteUrl?, theme? } — admin-only.
brandingRouter.post('/settings', requireAdmin, async (req, res, next) => {
  try {
    const { name, siteUrl, theme } = req.body;
    const results = {};
    if (name !== undefined) results.name = await setBrandName(name);
    if (siteUrl !== undefined) results.siteUrl = await setSiteUrl(siteUrl);
    if (theme !== undefined) results.theme = await setTheme(theme);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// POST /api/branding/logo — admin-only, multipart upload
brandingRouter.post('/logo', requireAdmin, (req, res) => {
  uploadLogo(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const url = `/uploads/branding/${req.file.filename}`;
    await setLogoUrl(url);
    res.json({ logoUrl: url });
  });
});

// DELETE /api/branding/logo — admin-only
brandingRouter.delete('/logo', requireAdmin, async (req, res, next) => {
  try {
    await removeLogoUrl();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
