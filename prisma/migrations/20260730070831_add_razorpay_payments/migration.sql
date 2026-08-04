-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR';

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "paymentsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionPriceInr" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchases_provider_providerReference_key" ON "purchases"("provider", "providerReference");

