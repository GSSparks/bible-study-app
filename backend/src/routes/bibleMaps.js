import { Router } from 'express';
import { getAllMaps, findMapsForReference, streamImage, invalidateIndex, toApiShape } from '../services/bibleMapsService.js';

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

// GET /api/bible-maps/image/:filename — serve PNG from submodule
bibleMapsRouter.get('/image/:filename', (req, res) => {
  const filename = req.params.filename;
  if (!streamImage(filename, res)) {
    res.status(404).json({ error: 'Map image not found.' });
  }
});

// POST /api/bible-maps/reindex — rebuild in-memory index
bibleMapsRouter.post('/reindex', (_req, res) => {
  invalidateIndex();
  res.json({ ok: true });
});
