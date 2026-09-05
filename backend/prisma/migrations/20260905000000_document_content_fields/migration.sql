-- This migration originally tried to add author, pageCount, and
-- extractedText to "Document" — but those columns (and filename/
-- createdAt, which schema.prisma had also drifted away from) already
-- existed in the real database. schema.prisma itself was stale, not
-- the database. Left as a deliberate no-op so this migration's
-- position in history stays intact and can be marked applied without
-- re-touching a database that was already correct.
SELECT 1;