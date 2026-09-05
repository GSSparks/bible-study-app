-- This migration originally tried to drop PersonalModule.code and add
-- PersonalEntry.title/relax key's NOT NULL constraint — but schema.prisma
-- was wrong on every count: code never existed, title already existed
-- (and is NOT NULL), key was already nullable, and the real relation
-- column is moduleId, not personalModuleId. The application code
-- (personalModuleService.js) was correct the entire time; only
-- schema.prisma had drifted. Left as a deliberate no-op so this
-- migration's position in history stays intact and can be marked
-- applied without touching a database that was already correct.
SELECT 1;