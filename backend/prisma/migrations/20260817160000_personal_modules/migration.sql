-- CreateTable
CREATE TABLE "PersonalModule" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalEntry" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "key" TEXT,
    "reference" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalEntry_moduleId_key_idx" ON "PersonalEntry"("moduleId", "key");

-- CreateIndex
CREATE INDEX "PersonalEntry_moduleId_reference_idx" ON "PersonalEntry"("moduleId", "reference");

-- AddForeignKey
ALTER TABLE "PersonalEntry" ADD CONSTRAINT "PersonalEntry_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "PersonalModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;