ALTER TABLE "PlanDesignLimit"
  ADD COLUMN "concurrentDesignLimit" INTEGER NOT NULL DEFAULT 3;

UPDATE "PlanDesignLimit"
SET "concurrentDesignLimit" = 3
WHERE "planKey" = 'pro'
  AND "concurrentDesignLimit" <> 3;
