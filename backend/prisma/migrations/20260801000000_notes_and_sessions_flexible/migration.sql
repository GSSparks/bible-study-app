-- AlterTable: Note becomes optionally freestanding (not anchored to a
-- passage), gains a title and a marker for assistant-saved notes.
ALTER TABLE "Note" ALTER COLUMN "reference" DROP NOT NULL;
ALTER TABLE "Note" ALTER COLUMN "module" DROP NOT NULL;
ALTER TABLE "Note" ADD COLUMN "title" TEXT;
ALTER TABLE "Note" ADD COLUMN "fromAssistant" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: StudySession context can now span multiple open windows
-- rather than a single reference/module.
ALTER TABLE "StudySession" ALTER COLUMN "reference" DROP NOT NULL;
ALTER TABLE "StudySession" ALTER COLUMN "module" DROP NOT NULL;
