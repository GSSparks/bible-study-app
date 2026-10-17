import { Router } from 'express';
import { getAllMaps, findMapsForReference, convertToImage, streamCachedImage, invalidateIndex, toApiShape } from '../services/bibleMapsService.js';

export const bibleMapsRouter = Router();

// GET /api/bible-maps/all — full index for browse UI
bibleMapsRouter.get('/all', async (_req, res, next) => {
  try {
    const maps = await getAllMaps();
    res.json(maps.map(toApiShape));
  } catch (err) {
    next(err);
  }
});

// GET /api/bible-maps/for-reference?ref=Genesis+4:5
bibleMapsRouter.get('/for-reference', async (req, res, next) => {
  try {
    const ref = req.query.ref;
    if (!ref) return res.status(400).json({ error: 'ref query param required' });
    const maps = await findMapsForReference(ref);
    res.json(maps.map(toApiShape));
  } catch (err) {
    next(err);
  }
});

// GET /api/bible-maps/image/:filename — serve locally-converted PNG (fallback for self-hosted PDFs)
bibleMapsRouter.get('/image/:filename', async (req, res, next) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    if (/[/\\]/.test(filename) || !filename.toLowerCase().endsWith('.pdf')) {
      return res.status(400).end();
    }
    if (streamCachedImage(filename, res)) return;
    await convertToImage(filename);
    if (!streamCachedImage(filename, res)) {
      res.status(404).json({ error: 'Map image not available. Ensure ImageMagick or Ghostscript is installed.' });
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/bible-maps/reindex — rebuild in-memory index after adding new files
bibleMapsRouter.post('/reindex', (_req, res) => {
  invalidateIndex();
  res.json({ ok: true });
});
