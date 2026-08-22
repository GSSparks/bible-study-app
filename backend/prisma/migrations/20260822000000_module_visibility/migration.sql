-- CreateTable
CREATE TABLE "ModuleVisibility" (
    "moduleCode" TEXT NOT NULL,
    "availableToUsers" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ModuleVisibility_pkey" PRIMARY KEY ("moduleCode")
);