-- CalendarLayer.userId must be nullable so system/built-in layers (userId = null) can be seeded.
-- The original migration created it NOT NULL by mistake.
ALTER TABLE "CalendarLayer" ALTER COLUMN "userId" DROP NOT NULL;

-- Unique constraint on (userId, name) was declared in schema but missing from the original migration.
-- NULL values are distinct in Postgres unique indexes, so (null, 'Civil') and (null, 'Hebrew') coexist fine.
CREATE UNIQUE INDEX IF NOT EXISTS "CalendarLayer_userId_name_key" ON "CalendarLayer"("userId", "name");

-- UserLayerVisibility was added to the schema without a corresponding migration.
CREATE TABLE IF NOT EXISTS "UserLayerVisibility" (
    "userId" TEXT NOT NULL,
    "layerId" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "UserLayerVisibility_pkey" PRIMARY KEY ("userId", "layerId")
);

ALTER TABLE "UserLayerVisibility"
    ADD CONSTRAINT "UserLayerVisibility_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserLayerVisibility"
    ADD CONSTRAINT "UserLayerVisibility_layerId_fkey"
    FOREIGN KEY ("layerId") REFERENCES "CalendarLayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
