-- CreateEnum
CREATE TYPE "ExternalCleanupTaskStatus" AS ENUM ('pending', 'processing', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "ExternalCleanupTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gcsPrefix" TEXT NOT NULL,
    "status" "ExternalCleanupTaskStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 12,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCleanupTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalCleanupTask_status_nextAttemptAt_idx" ON "ExternalCleanupTask"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "ExternalCleanupTask_userId_idx" ON "ExternalCleanupTask"("userId");
