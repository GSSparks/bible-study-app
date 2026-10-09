ALTER TABLE "StudyLesson" ADD COLUMN "reflectionPrompt" TEXT;

CREATE TABLE "StudyLessonReflection" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudyLessonReflection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudyLessonReflection_lessonId_userId_key" ON "StudyLessonReflection"("lessonId", "userId");
CREATE INDEX "StudyLessonReflection_userId_idx" ON "StudyLessonReflection"("userId");

ALTER TABLE "StudyLessonReflection" ADD CONSTRAINT "StudyLessonReflection_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "StudyLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyLessonReflection" ADD CONSTRAINT "StudyLessonReflection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
