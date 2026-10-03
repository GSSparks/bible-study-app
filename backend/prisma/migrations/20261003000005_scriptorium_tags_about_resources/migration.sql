ALTER TABLE "Scriptorium" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Scriptorium" ADD COLUMN "about" TEXT;
ALTER TABLE "Scriptorium" ADD COLUMN "weeklyVerse" TEXT;

CREATE TABLE "ScriptoriumResource" (
    "id" TEXT NOT NULL,
    "scriptoriumId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScriptoriumResource_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScriptoriumResource_scriptoriumId_idx" ON "ScriptoriumResource"("scriptoriumId");

ALTER TABLE "ScriptoriumResource" ADD CONSTRAINT "ScriptoriumResource_scriptoriumId_fkey" FOREIGN KEY ("scriptoriumId") REFERENCES "Scriptorium"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptoriumResource" ADD CONSTRAINT "ScriptoriumResource_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
