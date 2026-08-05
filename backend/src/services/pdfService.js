import fs from 'node:fs/promises';
import path from 'node:path';
import pdfParse from 'pdf-parse';
import { prisma } from '../db/prisma.js';
import { config } from '../config.js';

async function ensureStorageDir() {
  await fs.mkdir(config.pdfStoragePath, { recursive: true });
}

/** Save an uploaded PDF, extract text for search, and record metadata. */
export async function ingestPdf({ buffer, originalName, title, author }) {
  await ensureStorageDir();

  const safeName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const destPath = path.join(config.pdfStoragePath, safeName);
  await fs.writeFile(destPath, buffer);

  let pageCount = null;
  let extractedText = null;
  try {
    const parsed = await pdfParse(buffer);
    pageCount = parsed.numpages;
    // Cap stored text so a huge PDF doesn't blow up the DB row; the file
    // itself is always the source of truth for actual reading.
    extractedText = parsed.text.slice(0, 200_000);
  } catch (err) {
    // Keep the file even if text extraction fails (e.g. scanned/image PDF)
    console.warn(`PDF text extraction failed for ${originalName}:`, err.message);
  }

  return prisma.document.create({
    data: {
      title: title || originalName,
      author: author || null,
      filename: safeName,
      pageCount,
      extractedText,
    },
  });
}

export async function listDocuments() {
  return prisma.document.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, author: true, pageCount: true, createdAt: true, filename: true },
  });
}

export async function getDocumentFilePath(id) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return null;
  return path.join(config.pdfStoragePath, doc.filename);
}

export async function searchDocuments(term) {
  // Simple ILIKE search to start; swap for Postgres full-text search
  // (tsvector column + GIN index) once your library grows past a
  // few dozen PDFs.
  return prisma.document.findMany({
    where: {
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { extractedText: { contains: term, mode: 'insensitive' } },
      ],
    },
    select: { id: true, title: true, author: true },
    take: 25,
  });
}
