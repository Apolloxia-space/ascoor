-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('pricing', 'features', 'complex', 'switch', 'other');

-- CreateTable
CREATE TABLE "SubscriptionCancellationFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "planId" TEXT,
    "reason" "CancellationReason",
    "details" TEXT,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT true,
    "status" "SubscriptionStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionCancellationFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionCancellationFeedback_userId_idx" ON "SubscriptionCancellationFeedback"("userId");

-- CreateIndex
CREATE INDEX "SubscriptionCancellationFeedback_subscriptionId_idx" ON "SubscriptionCancellationFeedback"("subscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionCancellationFeedback_planId_idx" ON "SubscriptionCancellationFeedback"("planId");

-- AddForeignKey
ALTER TABLE "SubscriptionCancellationFeedback" ADD CONSTRAINT "SubscriptionCancellationFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionCancellationFeedback" ADD CONSTRAINT "SubscriptionCancellationFeedback_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionCancellationFeedback" ADD CONSTRAINT "SubscriptionCancellationFeedback_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
