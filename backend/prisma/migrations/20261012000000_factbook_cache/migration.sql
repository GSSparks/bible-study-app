-- CreateTable
CREATE TABLE "FactbookCache" (
    "id" SERIAL NOT NULL,
    "query" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summaryMd" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FactbookCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FactbookCache_query_key" ON "FactbookCache"("query");
