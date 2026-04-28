CREATE TYPE "CreditLedgerReason" AS ENUM ('monthly_grant', 'asset_generation', 'refund', 'admin_adjustment');

ALTER TABLE IF EXISTS "PlanDesignLimit" RENAME TO "PlanCreditAllowance";
ALTER TABLE IF EXISTS "PlanCreditAllowance" RENAME COLUMN "monthlyDesignLimit" TO "monthlyCredits";

ALTER INDEX IF EXISTS "PlanDesignLimit_pkey" RENAME TO "PlanCreditAllowance_pkey";
ALTER INDEX IF EXISTS "PlanDesignLimit_planKey_key" RENAME TO "PlanCreditAllowance_planKey_key";

CREATE TABLE "CreditLedger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" "CreditLedgerReason" NOT NULL,
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "relatedDesignId" TEXT,
  "relatedPartId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreditLedger_idempotencyKey_key" ON "CreditLedger"("idempotencyKey");
CREATE INDEX "CreditLedger_userId_createdAt_idx" ON "CreditLedger"("userId", "createdAt");
CREATE INDEX "CreditLedger_userId_periodStart_idx" ON "CreditLedger"("userId", "periodStart");
CREATE INDEX "CreditLedger_relatedDesignId_idx" ON "CreditLedger"("relatedDesignId");
CREATE INDEX "CreditLedger_relatedPartId_idx" ON "CreditLedger"("relatedPartId");

ALTER TABLE "CreditLedger"
  ADD CONSTRAINT "CreditLedger_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
