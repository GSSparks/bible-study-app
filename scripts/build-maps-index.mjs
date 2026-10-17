#!/usr/bin/env node
/**
 * Generates maps-index.json from the bible-images directory.
 *
 * Usage:
 *   node scripts/build-maps-index.mjs [pdf-directory] [output-path]
 *
 * Defaults:
 *   pdf-directory → ./bible-images
 *   output-path   → ./bible-images/maps-index.json
 *
 * Filename format examples:
 *   "Exodus 12:29-41-1030.pdf"                          → single reference
 *   "Exodus 1:15-22, Exodus 8:20-32-1021.pdf"           → multiple references
 *   "Abraham's Journey to Canaan-764.pdf"               → title only (no ref)
 *   "All Genesis Sites (Canaan)-1019.pdf"               → title only
 */

import { readdirSync, writeFileSync } from 'fs';
import { resolve, basename, extname } from 'path';

const dir = resolve(process.argv[2] || 'bible-images');
const out = resolve(process.argv[3] || `${dir}/maps-index.json`);

const files = readdirSync(dir).filter(f => extname(f).toLowerCase() === '.pdf');
console.log(`Found ${files.length} PDF files in ${dir}`);

const entries = files.map(filename => {
  const base = basename(filename, '.pdf');

  // ID is always the last -digits before .pdf
  const idMatch = base.match(/-(\d+)$/);
  if (!idMatch) {
    console.warn(`  ⚠ No ID found: ${filename}`);
    return null;
  }

  const id = idMatch[1];
  const title = base.slice(0, base.lastIndexOf(`-${id}`)).trim();

  // Try parsing comma-separated references from the title portion
  // e.g. "Exodus 1:15-22, Exodus 8:20-32" or "Genesis 12:1-9"
  const refPattern = /^(\d\s+)?[A-Z][a-z]+(\s+\d+:\d+(-\d+)?)?/;
  const references = title
    .split(',')
    .map(s => s.trim())
    .filter(s => refPattern.test(s));

  return { id, title, references, filename };
}).filter(Boolean);

entries.sort((a, b) => parseInt(a.id) - parseInt(b.id));

writeFileSync(out, JSON.stringify(entries, null, 2));
console.log(`Saved ${entries.length} entries → ${out}`);

// Summary
const withRefs = entries.filter(e => e.references.length > 0).length;
console.log(`  ${withRefs} have scripture references, ${entries.length - withRefs} are title-only`);
