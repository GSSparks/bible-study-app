/**
 * Startup seeder — installs a curated set of starter modules if they are not
 * already present. All failures are logged but never fatal; the server starts
 * regardless of whether seeding succeeds.
 *
 * SWORD modules are fetched from CrossWire over the network.
 * MD modules are extracted from zip files bundled in /app/seed-modules/.
 *
 * Run with: node src/scripts/seedModules.js
 * (or via the Dockerfile CMD before the main server starts)
 */

import 'dotenv/config';
import NodeSwordInterface from 'node-sword-interface';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { installMdModuleFromZip, listMdModules } from '../services/mdModuleService.js';

const SWORD_MODULES_PATH = process.env.SWORD_MODULES_PATH || '/data/sword-modules';
const SEED_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'seed-modules');

const STARTER_SWORD = [
  { repo: 'CrossWire', code: 'KJV' },
  { repo: 'CrossWire', code: 'BSB' },
  { repo: 'CrossWire', code: 'TSK' },
  { repo: 'CrossWire', code: 'Clarke' },
  { repo: 'CrossWire', code: 'StrongsGreek' },
  { repo: 'CrossWire', code: 'StrongsHebrew' },
];

const STARTER_MD = [
  'how-to-study-new-testament.zip',
];

async function seedSword() {
  const sword = new NodeSwordInterface(SWORD_MODULES_PATH);

  // Ensure repo config is available (downloads from CrossWire if needed)
  try {
    if (!sword.repositoryConfigExisting()) {
      console.log('[seed] Fetching CrossWire repository config…');
      await sword.updateRepositoryConfig();
    }
  } catch (err) {
    console.warn('[seed] Could not load CrossWire repo config — skipping SWORD seeding:', err.message);
    return;
  }

  // Build a set of already-installed module codes (case-sensitive)
  const installed = new Set();
  for (const type of ['BIBLE', 'COMMENTARY', 'DICT', 'LEXICON', 'BOOK']) {
    try {
      const mods = sword.getAllLocalModules(type);
      if (Array.isArray(mods)) mods.forEach((m) => installed.add(m.name));
    } catch {}
  }

  for (const { repo, code } of STARTER_SWORD) {
    if (installed.has(code)) {
      console.log(`[seed] ${code} already installed — skipping`);
      continue;
    }
    try {
      console.log(`[seed] Installing ${code} from ${repo}…`);
      await sword.installModule(repo, code, () => {});
      console.log(`[seed] ${code} installed`);
    } catch (err) {
      console.warn(`[seed] Failed to install ${code}:`, err.message);
    }
  }
}

async function seedMd() {
  // Build set of already-installed MD module dir names
  let existingMd;
  try {
    existingMd = await listMdModules();
  } catch {
    existingMd = [];
  }
  // listMdModules returns { name: 'md:<dirName>', ... }
  const installedDirs = new Set(existingMd.map((m) => m.name.replace(/^md:/, '')));

  for (const zipName of STARTER_MD) {
    const zipPath = path.join(SEED_DIR, zipName);
    if (!existsSync(zipPath)) {
      console.warn(`[seed] Seed zip not found: ${zipPath} — skipping`);
      continue;
    }

    // Derive expected dir name from the zip stem to check if already installed
    const stem = path.basename(zipName, '.zip');
    if (installedDirs.has(stem)) {
      console.log(`[seed] MD module ${stem} already installed — skipping`);
      continue;
    }

    try {
      console.log(`[seed] Installing MD module from ${zipName}…`);
      const buffer = readFileSync(zipPath);
      const code = await installMdModuleFromZip(buffer);
      console.log(`[seed] MD module installed as ${code}`);
    } catch (err) {
      console.warn(`[seed] Failed to install MD module ${zipName}:`, err.message);
    }
  }
}

async function main() {
  console.log('[seed] Starting module seeding…');
  await seedSword();
  await seedMd();
  console.log('[seed] Module seeding complete.');
}

main().catch((err) => {
  // Non-fatal — log and let server start anyway
  console.error('[seed] Unexpected error during seeding:', err);
});
