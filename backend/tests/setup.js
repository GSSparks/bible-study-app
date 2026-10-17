// Must be first — config.js throws if SESSION_SECRET is missing,
// and app.js reads NODE_ENV at import time for the session store branch.
process.env.SESSION_SECRET = 'test-session-secret-ci';
process.env.NODE_ENV = 'test';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tables listed in reverse FK dependency order so child rows are
// deleted before the parent rows they reference.
export async function cleanDb() {
  const tables = [
    'StudyCommentLike',
    'StudyComment',
    'StudyLessonReflection',
    'StudyLessonCompletion',
    'StudyResource',
    'StudyLesson',
    'StudyParticipant',
    'Study',
    'ScriptoriumResource',
    'ScriptoriumInvite',
    'ScriptoriumMembership',
    'Scriptorium',
    'Comment',
    'Post',
    'Connection',
    'ReadingPlanProgress',
    'ReadingPlan',
    'FactbookCache',
    'MerriamCache',
    'PersonalEntry',
    'PersonalModule',
    'Note',
    'Highlight',
    'Bookmark',
    'StudySession',
    'Document',
    'ModuleVisibility',
    'AppSetting',
    'User',
  ];

  for (const table of tables) {
    // Use raw SQL with quoted identifiers — Prisma model names are
    // PascalCase but the actual Postgres table names are the same
    // (Prisma mirrors the model name by default).
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
}

afterEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});
