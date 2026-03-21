-- Ensure single thread per project by merging duplicates (keep most recently updated).
CREATE TEMP TABLE to_move AS
WITH ranked AS (
  SELECT
    "id",
    "projectId",
    ROW_NUMBER() OVER (
      PARTITION BY "projectId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS rn,
    FIRST_VALUE("id") OVER (
      PARTITION BY "projectId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS keep_id
  FROM "ChatThread"
)
SELECT "id", keep_id FROM ranked WHERE rn > 1;
UPDATE "ChatMessage" AS m
SET "threadId" = t.keep_id
FROM to_move AS t
WHERE m."threadId" = t."id";

UPDATE "Generation" AS g
SET "threadId" = t.keep_id
FROM to_move AS t
WHERE g."threadId" = t."id";

DELETE FROM "ChatThread" AS ct
USING to_move AS t
WHERE ct."id" = t."id";

DROP INDEX IF EXISTS "ChatThread_projectId_idx";
CREATE UNIQUE INDEX "ChatThread_projectId_key" ON "ChatThread"("projectId");

DROP TABLE to_move;
