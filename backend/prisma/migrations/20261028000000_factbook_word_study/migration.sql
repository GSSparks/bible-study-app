ALTER TABLE "FactbookCache"
  ADD COLUMN "occurrences" JSONB,
  ADD COLUMN "studyType"   TEXT,
  ADD COLUMN "strongsKeys" TEXT[] NOT NULL DEFAULT '{}';
