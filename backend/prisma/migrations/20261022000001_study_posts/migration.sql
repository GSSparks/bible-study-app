-- Rename StudyFinding → StudyPost and extend it to support both free-form
-- posts and passage findings, and replies on either.

ALTER TABLE "StudyFinding" RENAME TO "StudyPost";

ALTER TABLE "StudyPost" RENAME CONSTRAINT "StudyFinding_pkey" TO "StudyPost_pkey";
ALTER TABLE "StudyPost" RENAME CONSTRAINT "StudyFinding_studyId_fkey" TO "StudyPost_studyId_fkey";
ALTER TABLE "StudyPost" RENAME CONSTRAINT "StudyFinding_authorId_fkey" TO "StudyPost_authorId_fkey";

ALTER INDEX "StudyFinding_studyId_idx" RENAME TO "StudyPost_studyId_idx";
ALTER INDEX "StudyFinding_studyId_reference_idx" RENAME TO "StudyPost_studyId_reference_idx";
ALTER INDEX "StudyFinding_authorId_idx" RENAME TO "StudyPost_authorId_idx";

-- Add type: existing rows were all findings, free-form posts default to 'post'
ALTER TABLE "StudyPost" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'post';
UPDATE "StudyPost" SET "type" = 'finding' WHERE "reference" IS NOT NULL;

-- Add parentId for replies (self-referential, one level)
ALTER TABLE "StudyPost" ADD COLUMN "parentId" TEXT;
ALTER TABLE "StudyPost" ADD CONSTRAINT "StudyPost_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "StudyPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "StudyPost_parentId_idx" ON "StudyPost"("parentId");
