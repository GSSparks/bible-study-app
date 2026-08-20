-- Phase 2: retrofit per-user ownership onto Note, Highlight, Bookmark,
-- StudySession, and PersonalModule. Cannot add a required (NOT NULL)
-- userId directly — these tables have real rows from before any user
-- existed, and Postgres rejects a NOT NULL column with no value to put
-- in existing rows. Safe sequence: add nullable, backfill existing
-- rows to the admin account (the reasonable owner of pre-multi-user
-- test data), then enforce NOT NULL once every row actually has a
-- value.

-- Step 1: add as nullable first
ALTER TABLE "Note" ADD COLUMN "userId" TEXT;
ALTER TABLE "Highlight" ADD COLUMN "userId" TEXT;
ALTER TABLE "Bookmark" ADD COLUMN "userId" TEXT;
ALTER TABLE "StudySession" ADD COLUMN "userId" TEXT;
ALTER TABLE "PersonalModule" ADD COLUMN "userId" TEXT;

-- Step 2: backfill every existing row to the admin account. Assumes
-- exactly one admin exists at migration time — true for this
-- deployment (bootstrapAdmin guarantees exactly one "first" admin, and
-- no other admins have been created since). If that assumption
-- doesn't hold by the time this actually runs, revisit before running
-- as-is rather than assuming it's still safe.
UPDATE "Note" SET "userId" = (SELECT "id" FROM "User" WHERE "role" = 'admin' ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "Highlight" SET "userId" = (SELECT "id" FROM "User" WHERE "role" = 'admin' ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "Bookmark" SET "userId" = (SELECT "id" FROM "User" WHERE "role" = 'admin' ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "StudySession" SET "userId" = (SELECT "id" FROM "User" WHERE "role" = 'admin' ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "PersonalModule" SET "userId" = (SELECT "id" FROM "User" WHERE "role" = 'admin' ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;

-- Step 3: now that every row has a value, enforce NOT NULL
ALTER TABLE "Note" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Highlight" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Bookmark" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "StudySession" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "PersonalModule" ALTER COLUMN "userId" SET NOT NULL;

-- Step 4: foreign keys and indexes (indexes matter here — every list
-- query for these tables is about to filter by userId on every single
-- request)
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "Highlight" ADD CONSTRAINT "Highlight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "PersonalModule" ADD CONSTRAINT "PersonalModule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

CREATE INDEX "Note_userId_idx" ON "Note"("userId");
CREATE INDEX "Highlight_userId_idx" ON "Highlight"("userId");
CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId");
CREATE INDEX "StudySession_userId_idx" ON "StudySession"("userId");
CREATE INDEX "PersonalModule_userId_idx" ON "PersonalModule"("userId");