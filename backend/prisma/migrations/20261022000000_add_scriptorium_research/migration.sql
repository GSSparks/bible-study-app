CREATE TABLE "StudyFinding" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "module" TEXT,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyFinding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudyHighlight" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'yellow',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyHighlight_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudyFinding_studyId_idx" ON "StudyFinding"("studyId");
CREATE INDEX "StudyFinding_studyId_reference_idx" ON "StudyFinding"("studyId", "reference");
CREATE INDEX "StudyFinding_authorId_idx" ON "StudyFinding"("authorId");

CREATE UNIQUE INDEX "StudyHighlight_studyId_authorId_reference_module_key" ON "StudyHighlight"("studyId", "authorId", "reference", "module");
CREATE INDEX "StudyHighlight_studyId_idx" ON "StudyHighlight"("studyId");
CREATE INDEX "StudyHighlight_studyId_reference_idx" ON "StudyHighlight"("studyId", "reference");

ALTER TABLE "StudyFinding" ADD CONSTRAINT "StudyFinding_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyFinding" ADD CONSTRAINT "StudyFinding_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudyHighlight" ADD CONSTRAINT "StudyHighlight_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyHighlight" ADD CONSTRAINT "StudyHighlight_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
