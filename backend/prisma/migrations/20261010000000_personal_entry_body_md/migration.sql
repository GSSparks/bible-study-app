-- Adds bodyMd (markdown source) alongside the existing HTML body on PersonalEntry.
-- Existing entries (AI conversations saved as commentary) keep body as HTML and get NULL here.
-- New user-written verse notes store the markdown source in bodyMd and pre-rendered HTML in body.
ALTER TABLE "PersonalEntry" ADD COLUMN "bodyMd" TEXT;
