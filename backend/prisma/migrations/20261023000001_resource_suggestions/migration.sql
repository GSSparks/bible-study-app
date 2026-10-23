-- Allow any study participant to suggest a resource for editor review.
ALTER TABLE "StudyResource" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE "StudyResource" ADD COLUMN "suggestorId" TEXT;
ALTER TABLE "StudyResource" ADD CONSTRAINT "StudyResource_suggestorId_fkey"
  FOREIGN KEY ("suggestorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "StudyResource_suggestorId_idx" ON "StudyResource"("suggestorId");
