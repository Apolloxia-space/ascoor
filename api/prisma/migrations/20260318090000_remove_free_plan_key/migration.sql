DROP TABLE IF EXISTS "PlanDesignLimit";

DROP TYPE IF EXISTS "PlanKey";

CREATE TYPE "PlanKey" AS ENUM ('pro');

CREATE TABLE "PlanDesignLimit" (
    "id" TEXT NOT NULL,
    "planKey" "PlanKey" NOT NULL,
    "monthlyDesignLimit" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanDesignLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanDesignLimit_planKey_key" ON "PlanDesignLimit"("planKey");
