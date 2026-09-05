-- CreateTable
CREATE TABLE "Scriptorium" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scriptorium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptoriumMembership" (
    "id" TEXT NOT NULL,
    "scriptoriumId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScriptoriumMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptoriumInvite" (
    "id" TEXT NOT NULL,
    "scriptoriumId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScriptoriumInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScriptoriumMembership_scriptoriumId_userId_key" ON "ScriptoriumMembership"("scriptoriumId", "userId");

-- CreateIndex
CREATE INDEX "ScriptoriumMembership_userId_idx" ON "ScriptoriumMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ScriptoriumInvite_scriptoriumId_inviteeId_key" ON "ScriptoriumInvite"("scriptoriumId", "inviteeId");

-- CreateIndex
CREATE INDEX "ScriptoriumInvite_inviteeId_status_idx" ON "ScriptoriumInvite"("inviteeId", "status");

-- AddForeignKey
ALTER TABLE "Scriptorium" ADD CONSTRAINT "Scriptorium_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptoriumMembership" ADD CONSTRAINT "ScriptoriumMembership_scriptoriumId_fkey" FOREIGN KEY ("scriptoriumId") REFERENCES "Scriptorium"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptoriumMembership" ADD CONSTRAINT "ScriptoriumMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptoriumInvite" ADD CONSTRAINT "ScriptoriumInvite_scriptoriumId_fkey" FOREIGN KEY ("scriptoriumId") REFERENCES "Scriptorium"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptoriumInvite" ADD CONSTRAINT "ScriptoriumInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptoriumInvite" ADD CONSTRAINT "ScriptoriumInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;