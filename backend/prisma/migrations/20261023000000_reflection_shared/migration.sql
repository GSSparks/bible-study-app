-- Allow participants to share their reflection with the group.
ALTER TABLE "StudyLessonReflection" ADD COLUMN "shared" BOOLEAN NOT NULL DEFAULT false;
