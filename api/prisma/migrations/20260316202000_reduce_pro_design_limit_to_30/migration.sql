-- Align the persisted pro plan monthly design limit with product pricing.

UPDATE "PlanDesignLimit"
SET "monthlyDesignLimit" = 30
WHERE "planKey" = 'pro'
  AND "monthlyDesignLimit" <> 30;
