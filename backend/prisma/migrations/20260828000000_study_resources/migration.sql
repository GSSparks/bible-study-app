-- CreateTable
CREATE TABLE "StudyResource" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "moduleCode" TEXT,
    "url" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyResource_studyId_idx" ON "StudyResource"("studyId");

-- AddForeignKey
ALTER TABLE "StudyResource" ADD CONSTRAINT "StudyResource_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;