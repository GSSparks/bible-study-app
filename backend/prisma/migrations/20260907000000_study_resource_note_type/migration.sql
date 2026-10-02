-- Adds a nullable "body" column to StudyResource, for the new "note"
-- resource type (free-text, written directly by the study owner,
-- rather than pointing at an external module or URL). Purely
-- additive and safe against existing rows — commentary/link resources
-- simply get NULL here, same as they already have NULL for whichever
-- of moduleCode/url doesn't apply to their own type.
ALTER TABLE "StudyResource" ADD COLUMN "body" TEXT;