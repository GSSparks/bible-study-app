/**
 * One-time migration: copy PersonalEntry COMMENTARY records into the Note
 * table with tags ['personal-commentary'].
 *
 * Called automatically at server startup (idempotent — skips entries that
 * already exist in Note, matched by userId + reference).
 *
 * Can also be run standalone from backend/:
 *   node scripts/migrate-commentary-to-notes.js
 */

import { prisma } from '../src/db/prisma.js';

export async function migrateCommentaryToNotes() {
  const mods = await prisma.personalModule.findMany({
    where: { type: 'COMMENTARY' },
    select: { id: true, userId: true },
  });

  if (mods.length === 0) return;

  const modIds = mods.map((m) => m.id);
  const modUserMap = Object.fromEntries(mods.map((m) => [m.id, m.userId]));

  const allEntries = await prisma.personalEntry.findMany({
    where: { moduleId: { in: modIds }, reference: { not: null } },
  });

  if (allEntries.length === 0) return;

  const userIds = [...new Set(mods.map((m) => m.userId))];
  const references = [...new Set(allEntries.map((e) => e.reference).filter(Boolean))];

  const existingNotes = await prisma.note.findMany({
    where: { userId: { in: userIds }, tags: { has: 'personal-commentary' }, reference: { in: references } },
    select: { userId: true, reference: true },
  });
  const existingSet = new Set(existingNotes.map((n) => `${n.userId}|${n.reference}`));

  let migrated = 0;
  for (const entry of allEntries) {
    const userId = modUserMap[entry.moduleId];
    if (!userId) continue;
    if (existingSet.has(`${userId}|${entry.reference}`)) continue;
    await prisma.note.create({
      data: {
        userId,
        reference: entry.reference,
        title: entry.title,
        body: entry.bodyMd || entry.body || '',
        tags: ['personal-commentary'],
      },
    });
    migrated++;
  }

  if (migrated > 0) console.log(`Commentary migration: moved ${migrated} entries to Note table.`);
}

// Allow running standalone
if (process.argv[1].endsWith('migrate-commentary-to-notes.js')) {
  migrateCommentaryToNotes()
    .then(() => console.log('Done.'))
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
