-- CreateEnum
CREATE TYPE "PlanKey" AS ENUM ('free', 'pro');

-- AlterTable
ALTER TABLE "GenerationJob" ADD COLUMN     "usagePeriodEnd" TIMESTAMP(3),
ADD COLUMN     "usagePeriodStart" TIMESTAMP(3),
ADD COLUMN     "usagePlanId" TEXT;

-- CreateTable
CREATE TABLE "GenerationUsageMonthly" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "planId" TEXT,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "reservedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationUsageMonthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanGenerationLimit" (
    "id" TEXT NOT NULL,
    "planKey" "PlanKey" NOT NULL,
    "monthlyGenerationLimit" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanGenerationLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GenerationUsageMonthly_userId_periodEnd_idx" ON "GenerationUsageMonthly"("userId", "periodEnd");

-- CreateIndex
CREATE INDEX "GenerationUsageMonthly_planId_idx" ON "GenerationUsageMonthly"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationUsageMonthly_userId_periodStart_key" ON "GenerationUsageMonthly"("userId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "PlanGenerationLimit_planKey_key" ON "PlanGenerationLimit"("planKey");

-- CreateIndex
CREATE INDEX "GenerationJob_usagePlanId_idx" ON "GenerationJob"("usagePlanId");

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_usagePlanId_fkey" FOREIGN KEY ("usagePlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationUsageMonthly" ADD CONSTRAINT "GenerationUsageMonthly_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationUsageMonthly" ADD CONSTRAINT "GenerationUsageMonthly_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

