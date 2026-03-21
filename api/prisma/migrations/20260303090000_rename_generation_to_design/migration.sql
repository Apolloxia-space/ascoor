-- Rename generation domain objects to design.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GenerationStatus') THEN
    ALTER TYPE "GenerationStatus" RENAME TO "DesignStatus";
  END IF;
END $$;

ALTER TABLE IF EXISTS "GenerationJob" RENAME TO "DesignJob";
ALTER TABLE IF EXISTS "GenerationUsageMonthly" RENAME TO "DesignUsageMonthly";
ALTER TABLE IF EXISTS "PlanGenerationLimit" RENAME TO "PlanDesignLimit";

ALTER TABLE IF EXISTS "PlanDesignLimit"
  RENAME COLUMN "monthlyGenerationLimit" TO "monthlyDesignLimit";

-- Rename constraints for consistency with Prisma default naming.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GenerationJob_pkey'
  ) THEN
    ALTER TABLE "DesignJob" RENAME CONSTRAINT "GenerationJob_pkey" TO "DesignJob_pkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GenerationJob_projectId_fkey'
  ) THEN
    ALTER TABLE "DesignJob" RENAME CONSTRAINT "GenerationJob_projectId_fkey" TO "DesignJob_projectId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GenerationJob_userId_fkey'
  ) THEN
    ALTER TABLE "DesignJob" RENAME CONSTRAINT "GenerationJob_userId_fkey" TO "DesignJob_userId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GenerationJob_fileId_fkey'
  ) THEN
    ALTER TABLE "DesignJob" RENAME CONSTRAINT "GenerationJob_fileId_fkey" TO "DesignJob_fileId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GenerationJob_usagePlanId_fkey'
  ) THEN
    ALTER TABLE "DesignJob" RENAME CONSTRAINT "GenerationJob_usagePlanId_fkey" TO "DesignJob_usagePlanId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GenerationUsageMonthly_pkey'
  ) THEN
    ALTER TABLE "DesignUsageMonthly" RENAME CONSTRAINT "GenerationUsageMonthly_pkey" TO "DesignUsageMonthly_pkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GenerationUsageMonthly_userId_fkey'
  ) THEN
    ALTER TABLE "DesignUsageMonthly" RENAME CONSTRAINT "GenerationUsageMonthly_userId_fkey" TO "DesignUsageMonthly_userId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GenerationUsageMonthly_planId_fkey'
  ) THEN
    ALTER TABLE "DesignUsageMonthly" RENAME CONSTRAINT "GenerationUsageMonthly_planId_fkey" TO "DesignUsageMonthly_planId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlanGenerationLimit_pkey'
  ) THEN
    ALTER TABLE "PlanDesignLimit" RENAME CONSTRAINT "PlanGenerationLimit_pkey" TO "PlanDesignLimit_pkey";
  END IF;
END $$;

-- Rename indexes for consistency with Prisma default naming.
ALTER INDEX IF EXISTS "GenerationJob_projectId_idx" RENAME TO "DesignJob_projectId_idx";
ALTER INDEX IF EXISTS "GenerationJob_userId_idx" RENAME TO "DesignJob_userId_idx";
ALTER INDEX IF EXISTS "GenerationJob_status_idx" RENAME TO "DesignJob_status_idx";
ALTER INDEX IF EXISTS "GenerationJob_fileId_idx" RENAME TO "DesignJob_fileId_idx";
ALTER INDEX IF EXISTS "GenerationJob_usagePlanId_idx" RENAME TO "DesignJob_usagePlanId_idx";

ALTER INDEX IF EXISTS "GenerationUsageMonthly_userId_periodEnd_idx" RENAME TO "DesignUsageMonthly_userId_periodEnd_idx";
ALTER INDEX IF EXISTS "GenerationUsageMonthly_planId_idx" RENAME TO "DesignUsageMonthly_planId_idx";
ALTER INDEX IF EXISTS "GenerationUsageMonthly_userId_periodStart_key" RENAME TO "DesignUsageMonthly_userId_periodStart_key";

ALTER INDEX IF EXISTS "PlanGenerationLimit_planKey_key" RENAME TO "PlanDesignLimit_planKey_key";
