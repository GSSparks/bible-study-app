CREATE TABLE "DayImage" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "layerId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DayImage_year_month_day_layerId_key" ON "DayImage"("year", "month", "day", "layerId");
CREATE INDEX "DayImage_userId_year_month_idx" ON "DayImage"("userId", "year", "month");
ALTER TABLE "DayImage" ADD CONSTRAINT "DayImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;   
