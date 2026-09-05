-- CreateTable
CREATE TABLE "Study" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scriptoriumId" TEXT,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Study_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyLesson" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "module" TEXT,
    "reference" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyParticipant" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'participant',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyLessonCompletion" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyLessonCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Study_scriptoriumId_idx" ON "Study"("scriptoriumId");
CREATE INDEX "Study_creatorId_idx" ON "Study"("creatorId");
CREATE INDEX "StudyLesson_studyId_idx" ON "StudyLesson"("studyId");
CREATE UNIQUE INDEX "StudyParticipant_studyId_userId_key" ON "StudyParticipant"("studyId", "userId");
CREATE INDEX "StudyParticipant_userId_idx" ON "StudyParticipant"("userId");
CREATE UNIQUE INDEX "StudyLessonCompletion_lessonId_userId_key" ON "StudyLessonCompletion"("lessonId", "userId");
CREATE INDEX "StudyLessonCompletion_userId_idx" ON "StudyLessonCompletion"("userId");

-- AddForeignKey
ALTER TABLE "Study" ADD CONSTRAINT "Study_scriptoriumId_fkey" FOREIGN KEY ("scriptoriumId") REFERENCES "Scriptorium"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Study" ADD CONSTRAINT "Study_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyLesson" ADD CONSTRAINT "StudyLesson_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyParticipant" ADD CONSTRAINT "StudyParticipant_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyParticipant" ADD CONSTRAINT "StudyParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyLessonCompletion" ADD CONSTRAINT "StudyLessonCompletion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "StudyLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyLessonCompletion" ADD CONSTRAINT "StudyLessonCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;