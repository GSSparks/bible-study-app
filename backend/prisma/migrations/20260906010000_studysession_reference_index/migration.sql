-- schema.prisma already declared @@index([reference]) on StudySession,
-- but the real database never actually had this index — only
-- StudySession_pkey and StudySession_userId_idx exist. Everything
-- else about this model (module, contextSnapshot columns) was already
-- correct in the real database; schema.prisma just hadn't caught up
-- to it. This migration adds the one thing that was genuinely
-- missing. IF NOT EXISTS as a defensive measure, given how much
-- schema/database drift has turned up elsewhere in this project.
CREATE INDEX IF NOT EXISTS "StudySession_reference_idx" ON "StudySession"("reference");