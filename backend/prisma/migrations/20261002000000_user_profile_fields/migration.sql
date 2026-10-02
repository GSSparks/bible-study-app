-- Adds optional profile fields to User. Purely additive — existing
-- rows get NULL for both, which is valid since both are optional.
ALTER TABLE "User" ADD COLUMN "displayName" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
