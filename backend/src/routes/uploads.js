import { Router } from 'express';
import { requireLogin } from '../middleware/auth.js';
import { uploadAvatar, uploadBanner, UPLOADS_PATH } from '../middleware/upload.js';
import { prisma } from '../db/prisma.js';

export const uploadsRouter = Router();
uploadsRouter.use(requireLogin);

uploadsRouter.post('/avatar', (req, res) => {
  uploadAvatar(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const url = `/uploads/avatars/${req.file.filename}`;
    await prisma.user.update({ where: { id: req.user.id }, data: { avatarUrl: url } });
    res.json({ url });
  });
});

uploadsRouter.post('/banner/user', (req, res) => {
  uploadBanner(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const url = `/uploads/banners/${req.file.filename}`;
    await prisma.user.update({ where: { id: req.user.id }, data: { bannerUrl: url } });
    res.json({ url });
  });
});

uploadsRouter.post('/banner/scriptorium/:id', async (req, res) => {
  const scriptorium = await prisma.scriptorium.findFirst({
    where: { id: req.params.id, ownerId: req.user.id },
  });
  if (!scriptorium) return res.status(404).json({ error: 'Not found.' });

  uploadBanner(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const url = `/uploads/banners/${req.file.filename}`;
    await prisma.scriptorium.update({ where: { id: req.params.id }, data: { bannerUrl: url } });
    res.json({ url });
  });
});
