import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import { ingestPdf, listDocuments, getDocumentFilePath } from '../services/pdfService.js';

const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are accepted'));
    }
    cb(null, true);
  },
});

export const pdfRouter = Router();

// GET /api/pdf  -> library listing
pdfRouter.get('/', async (req, res, next) => {
  try {
    res.json(await listDocuments());
  } catch (err) {
    next(err);
  }
});

// POST /api/pdf  (multipart form: file, title?, author?)
pdfRouter.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    const doc = await ingestPdf({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      title: req.body.title,
      author: req.body.author,
    });
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

// GET /api/pdf/:id/file -> stream the actual PDF for viewing/download
pdfRouter.get('/:id/file', async (req, res, next) => {
  try {
    const filePath = await getDocumentFilePath(req.params.id);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'not found' });
    }
    res.setHeader('Content-Type', 'application/pdf');
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
});
