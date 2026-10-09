import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    proc.stdout.on('data', (d) => chunks.push(d));
    proc.on('close', (code) => {
      if (code !== 0) reject(new Error(`${cmd} exited with code ${code}`));
      else resolve(Buffer.concat(chunks).toString('utf8'));
    });
    proc.on('error', reject);
  });
}

export async function isOcrAvailable() {
  try {
    await run('tesseract', ['--version']);
    return true;
  } catch {
    return false;
  }
}

/** OCR a PDF file. Returns extracted text (capped at 200K chars) or null on failure. */
export async function ocrPdf(pdfPath) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ocr-'));
  try {
    // Render each PDF page to PNG at 150 DPI — good balance of OCR accuracy vs speed
    await run('pdftoppm', ['-r', '150', '-png', pdfPath, path.join(tmpDir, 'page')]);

    const files = (await fs.readdir(tmpDir))
      .filter((f) => f.endsWith('.png'))
      .sort();

    if (files.length === 0) return null;

    const pageTexts = [];
    for (const file of files) {
      const text = await run('tesseract', [
        path.join(tmpDir, file),
        'stdout',
        '-l', 'eng',
        '--psm', '3',
      ]);
      pageTexts.push(text.trim());
    }

    const combined = pageTexts.join('\n\n').trim();
    return combined ? combined.slice(0, 200_000) : null;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
