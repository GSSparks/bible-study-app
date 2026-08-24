-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Connection_requesterId_recipientId_key" ON "Connection"("requesterId", "recipientId");

-- CreateIndex
CREATE INDEX "Connection_recipientId_status_idx" ON "Connection"("recipientId", "status");

-- CreateIndex
CREATE INDEX "Connection_requesterId_status_idx" ON "Connection"("requesterId", "status");

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;