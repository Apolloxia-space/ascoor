ALTER TABLE "ChatMessage" ADD COLUMN "projectId" TEXT;

UPDATE "ChatMessage" AS m
SET "projectId" = t."projectId"
FROM "ChatThread" AS t
WHERE m."threadId" = t."id";

ALTER TABLE "ChatMessage" ALTER COLUMN "projectId" SET NOT NULL;

ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ChatMessage_projectId_idx" ON "ChatMessage"("projectId");

ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_threadId_fkey";
ALTER TABLE "Generation" DROP CONSTRAINT "Generation_threadId_fkey";

DROP INDEX IF EXISTS "ChatMessage_threadId_idx";
DROP INDEX IF EXISTS "Generation_threadId_idx";

ALTER TABLE "ChatMessage" DROP COLUMN "threadId";
ALTER TABLE "Generation" DROP COLUMN "threadId";

DROP TABLE "ChatThread";
