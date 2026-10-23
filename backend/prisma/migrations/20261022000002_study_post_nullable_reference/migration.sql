-- reference is only required for findings (type='finding'); posts and replies
-- have no passage anchor so the column must be nullable.
ALTER TABLE "StudyPost" ALTER COLUMN "reference" DROP NOT NULL;
