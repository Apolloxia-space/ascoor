-- Align the persisted pro plan monthly design limit with the current product plan.

UPDATE "PlanDesignLimit"
SET "monthlyDesignLimit" = 100
WHERE "planKey" = 'pro'
  AND "monthlyDesignLimit" <> 100;
