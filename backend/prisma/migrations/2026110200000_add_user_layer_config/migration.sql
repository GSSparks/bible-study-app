CREATE TABLE "UserLayerConfig" (
    "userId" TEXT NOT NULL,
    "layerId" TEXT NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserLayerConfig_pkey" PRIMARY KEY ("userId", "layerId")
);

CREATE INDEX "UserLayerConfig_layerId_idx" ON "UserLayerConfig"("layerId");

ALTER TABLE "UserLayerConfig" ADD CONSTRAINT "UserLayerConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserLayerConfig" ADD CONSTRAINT "UserLayerConfig_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "CalendarLayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;   
