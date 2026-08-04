-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "hasLifetimeAccess" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "programming_problems" ADD COLUMN     "accessType" TEXT NOT NULL DEFAULT 'FREE';

-- AlterTable
ALTER TABLE "sql_problems" ADD COLUMN     "accessType" TEXT NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "purchases" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "providerReference" TEXT,
    "amount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchases_studentId_idx" ON "purchases"("studentId");

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
