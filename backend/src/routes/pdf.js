import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { ingestPdf, listDocuments, getDocumentFilePath, getDocument, searchDocuments, updateDocument, deleteDocument, ocrDocument } from '../services/pdfService.js';
import { requireAdmin } from '../middleware/auth.js';

const ACCEPTED_MIMES = new Set([
  'application/pdf',
  'application/msword',                                                        // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  // .docx
]);

const CONTENT_TYPES = {
  '.pdf':  'application/pdf',
  '.doc':  'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per file
  fileFilter: (req, file, cb) => {
    if (!ACCEPTED_MIMES.has(file.mimetype)) {
      return cb(new Error('Only PDF, DOC, and DOCX files are accepted'));
    }
    cb(null, true);
  },
});

export const pdfRouter = Router();

// GET /api/pdf/search?q=term — full-text search across title + extracted body.
// Must be registered before /:id so Express doesn't treat "search" as an id.
pdfRouter.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    res.json(await searchDocuments(q));
  } catch (err) {
    next(err);
  }
});

// GET /api/pdf  -> library listing. Public — the library is available
// to anonymous visitors; only uploading new material is admin-only.
pdfRouter.get('/', async (req, res, next) => {
  try {
    res.json(await listDocuments());
  } catch (err) {
    next(err);
  }
});

// POST /api/pdf  (multipart form: file, title?, author?) — admin-only.
// requireAdmin runs BEFORE multer's file-parsing middleware
// deliberately, same reasoning as modules.js's upload route: it only
// needs req.user, not the parsed body, so a non-admin's request is
// rejected before the (possibly 100MB) file is parsed at all.
pdfRouter.post('/', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });
    const doc = await ingestPdf({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      title: req.body.title,
      author: req.body.author,
      collection: req.body.collection,
    });
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

// GET /api/pdf/:id -> document metadata + extracted text (for in-app reader / AI context).
pdfRouter.get('/:id', async (req, res, next) => {
  try {
    const doc = await getDocument(req.params.id);
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/pdf/:id — update title and/or author. Admin-only.
pdfRouter.patch('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { title, author, collection } = req.body;
    const doc = await updateDocument(req.params.id, { title, author, collection });
    res.json(doc);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'not found' });
    next(err);
  }
});

// DELETE /api/pdf/:id — delete document record and file. Admin-only.
pdfRouter.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const doc = await deleteDocument(req.params.id);
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// POST /api/pdf/:id/ocr — run OCR on an existing document. Admin-only.
// Can take several minutes for large/multi-page scanned PDFs.
pdfRouter.post('/:id/ocr', requireAdmin, async (req, res, next) => {
  try {
    const doc = await ocrDocument(req.params.id);
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// GET /api/pdf/:id/file -> stream the document file for viewing/download.
// Public, same reasoning as the listing above.
pdfRouter.get('/:id/file', async (req, res, next) => {
  try {
    const filePath = await getDocumentFilePath(req.params.id);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'not found' });
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
});