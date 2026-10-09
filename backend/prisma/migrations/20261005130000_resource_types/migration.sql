-- Add moduleType to StudyResource so Bible/Dict modules can be resources alongside commentaries
ALTER TABLE "StudyResource" ADD COLUMN "moduleType" TEXT;

-- Upgrade ScriptoriumResource to support typed resources (notes, documents, links)
ALTER TABLE "ScriptoriumResource" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'link';
ALTER TABLE "ScriptoriumResource" ADD COLUMN "body" TEXT;
ALTER TABLE "ScriptoriumResource" ALTER COLUMN "url" DROP NOT NULL;
