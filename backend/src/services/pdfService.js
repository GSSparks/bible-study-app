import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { prisma } from '../db/prisma.js';
import { config } from '../config.js';
import { isOcrAvailable, ocrPdf } from './ocrService.js';

const execFileAsync = promisify(execFile);

async function ensureStorageDir() {
  await fs.mkdir(config.pdfStoragePath, { recursive: true });
}

/** Extract plain text from a Word .docx buffer using mammoth. */
async function extractDocxText(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.slice(0, 200_000) || null;
}

/** Extract plain text from a legacy .doc file using antiword. */
async function extractDocText(buffer) {
  const tmp = path.join(os.tmpdir(), `doc-${Date.now()}.doc`);
  try {
    await fs.writeFile(tmp, buffer);
    const { stdout } = await execFileAsync('antiword', [tmp]);
    return stdout.slice(0, 200_000) || null;
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
}

/** Save an uploaded document, extract text for search, and record metadata. */
export async function ingestPdf({ buffer, originalName, title, author, collection }) {
  await ensureStorageDir();

  const safeName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const destPath = path.join(config.pdfStoragePath, safeName);
  await fs.writeFile(destPath, buffer);

  const ext = path.extname(originalName).toLowerCase();
  let pageCount = null;
  let extractedText = null;

  if (ext === '.docx') {
    try {
      extractedText = await extractDocxText(buffer);
    } catch (err) {
      console.warn(`DOCX text extraction failed for ${originalName}:`, err.message);
    }
  } else if (ext === '.doc') {
    try {
      extractedText = await extractDocText(buffer);
    } catch (err) {
      console.warn(`DOC text extraction failed for ${originalName}:`, err.message);
    }
  } else {
    // PDF path
    try {
      const parsed = await pdfParse(buffer);
      pageCount = parsed.numpages;
      extractedText = parsed.text.slice(0, 200_000);
    } catch (err) {
      console.warn(`PDF text extraction failed for ${originalName}:`, err.message);
    }

    // Scanned/image PDF: try OCR if selectable text is sparse
    const printableChars = (extractedText || '').replace(/\s/g, '').length;
    const isLikelyImagePdf = printableChars < Math.max(100, (pageCount || 1) * 100);
    if (isLikelyImagePdf) {
      try {
        if (await isOcrAvailable()) {
          console.log(`Running OCR on ${originalName}…`);
          const ocrText = await ocrPdf(destPath);
          if (ocrText) extractedText = ocrText;
        }
      } catch (err) {
        console.warn(`OCR failed for ${originalName}:`, err.message);
      }
    }
  }

  return prisma.document.create({
    data: {
      title: title || originalName,
      author: author || null,
      collection: collection || null,
      filename: safeName,
      pageCount,
      extractedText,
    },
  });
}

export async function listDocuments() {
  return prisma.document.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, author: true, collection: true, pageCount: true, createdAt: true, filename: true },
  });
}

export async function getDocumentFilePath(id) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return null;
  return path.join(config.pdfStoragePath, doc.filename);
}

export async function getDocument(id) {
  return prisma.document.findUnique({ where: { id } });
}

export async function updateDocument(id, { title, author, collection }) {
  const data = {};
  if (title !== undefined) data.title = title;
  if (author !== undefined) data.author = author;
  if (collection !== undefined) data.collection = collection || null;
  const updated = await prisma.document.update({ where: { id }, data });
  // Keep study resource labels in sync when a document is renamed.
  if (title !== undefined) {
    await prisma.studyResource.updateMany({
      where: { url: `/api/pdf/${id}/file` },
      data: { label: title },
    });
  }
  return updated;
}

export async function deleteDocument(id) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return null;
  // Remove any study resources that reference this document before deleting.
  await prisma.studyResource.deleteMany({ where: { url: `/api/pdf/${id}/file` } });
  try {
    await fs.unlink(path.join(config.pdfStoragePath, doc.filename));
  } catch (err) {
    console.warn(`Could not delete PDF file ${doc.filename}:`, err.message);
  }
  return prisma.document.delete({ where: { id } });
}

export async function ocrDocument(id) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return null;
  const filePath = path.join(config.pdfStoragePath, doc.filename);
  const text = await ocrPdf(filePath);
  if (!text) throw new Error('OCR produced no text — the file may not be readable.');
  return prisma.document.update({ where: { id }, data: { extractedText: text } });
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