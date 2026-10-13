import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '../config.js';
import { swordService } from '../services/swordService.js';

export const swordImagesRouter = Router();

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

// GET /api/sword-img?module=Maps&path=images/001.jpg
// Serves image files embedded in SWORD module entries.
swordImagesRouter.get('/', (req, res) => {
  const moduleCode = (req.query.module || '').trim();
  const imgPath = (req.query.path || '').trim();

  if (!moduleCode || !imgPath) return res.status(400).end();

  // Prevent directory traversal
  if (imgPath.includes('..') || path.isAbsolute(imgPath)) return res.status(403).end();

  const dataDir = swordService.getModuleDataPath(moduleCode);
  if (!dataDir) return res.status(404).end();

  const swordBase = path.join(config.swordModulesPath, '.sword');
  const fullPath = path.resolve(swordBase, dataDir, imgPath);

  // Ensure resolved path stays inside the sword data directory
  if (!fullPath.startsWith(swordBase + path.sep) && fullPath !== swordBase) {
    return res.status(403).end();
  }

  if (!fs.existsSync(fullPath)) return res.status(404).end();

  const ext = path.extname(imgPath).toLowerCase();
  res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  fs.createReadStream(fullPath).pipe(res);
});
