-- Add media attachments and editing support to StudyPost.
-- mediaUrls stores [{url, type}] JSON (nullable — existing posts have none).
ALTER TABLE "StudyPost" ADD COLUMN "mediaUrls" JSONB;
