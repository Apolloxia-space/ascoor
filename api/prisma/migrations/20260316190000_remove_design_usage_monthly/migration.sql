ALTER TABLE "DesignJob"
  DROP COLUMN IF EXISTS "usagePeriodStart",
  DROP COLUMN IF EXISTS "usagePeriodEnd",
  DROP COLUMN IF EXISTS "usagePlanId";

DROP TABLE IF EXISTS "DesignUsageMonthly";
