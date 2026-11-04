-- CreateEnum not needed (strings with comments, matching existing pattern)

CREATE TABLE "CalendarLayer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "calendarSystem" TEXT NOT NULL DEFAULT 'gregorian',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarLayer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarEntry" (
    "id" TEXT NOT NULL,
    "layerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER,
    "recurrence" TEXT,
    "icon" TEXT,
    "reference" TEXT,
    "module" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarLayerShare" (
    "id" TEXT NOT NULL,
    "layerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarLayerShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarPrintConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "layout" TEXT NOT NULL DEFAULT 'single-month',
    "paper" TEXT NOT NULL DEFAULT 'letter',
    "orientation" TEXT NOT NULL DEFAULT 'portrait',
    "layerIds" TEXT[],
    "coverImageId" TEXT,
    "coverTitle" TEXT,
    "coverVerseRef" TEXT,
    "coverVerseText" TEXT,
    "dayBgImageIds" JSONB,
    "overlayOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.65,
    "showWeekdayHeaders" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarPrintConfig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CalendarLayer_userId_idx" ON "CalendarLayer"("userId");

CREATE INDEX "CalendarEntry_layerId_year_month_idx" ON "CalendarEntry"("layerId", "year", "month");
CREATE INDEX "CalendarEntry_layerId_year_idx" ON "CalendarEntry"("layerId", "year");

CREATE UNIQUE INDEX "CalendarLayerShare_layerId_userId_key" ON "CalendarLayerShare"("layerId", "userId");
CREATE INDEX "CalendarLayerShare_userId_idx" ON "CalendarLayerShare"("userId");

CREATE INDEX "CalendarPrintConfig_userId_year_idx" ON "CalendarPrintConfig"("userId", "year");

ALTER TABLE "CalendarLayer" ADD CONSTRAINT "CalendarLayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "CalendarLayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CalendarLayerShare" ADD CONSTRAINT "CalendarLayerShare_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "CalendarLayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarLayerShare" ADD CONSTRAINT "CalendarLayerShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CalendarPrintConfig" ADD CONSTRAINT "CalendarPrintConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;   
