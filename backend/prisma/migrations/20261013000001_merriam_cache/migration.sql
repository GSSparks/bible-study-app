CREATE TABLE "MerriamCache" (
    "id" SERIAL NOT NULL,
    "query" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerriamCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MerriamCache_query_key" ON "MerriamCache"("query");
