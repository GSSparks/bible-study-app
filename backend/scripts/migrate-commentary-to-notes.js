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

  let migrated = 0;

  for (const mod of mods) {
    const entries = await prisma.personalEntry.findMany({
      where: { moduleId: mod.id, reference: { not: null } },
    });

    for (const entry of entries) {
      const existing = await prisma.note.findFirst({
        where: { userId: mod.userId, tags: { has: 'personal-commentary' }, reference: entry.reference },
      });
      if (existing) continue;

      await prisma.note.create({
        data: {
          userId: mod.userId,
          reference: entry.reference,
          title: entry.title,
          body: entry.bodyMd || entry.body || '',
          tags: ['personal-commentary'],
        },
      });
      migrated++;
    }
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
