ALTER TABLE "StudySession" ADD COLUMN "kind" TEXT DEFAULT 'conversation';

CREATE INDEX "StudySession_userId_kind_reference_idx" ON "StudySession"("userId", "kind", "reference");
