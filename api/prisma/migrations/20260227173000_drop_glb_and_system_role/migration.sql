-- Remove legacy binary/python asset URI columns if they still exist.
ALTER TABLE "ProjectFile" DROP COLUMN IF EXISTS "assetUriStl";
ALTER TABLE "ProjectFile" DROP COLUMN IF EXISTS "assetUriGlb";
ALTER TABLE "ProjectFile" DROP COLUMN IF EXISTS "assetUriPy";

-- Normalize deprecated role values before shrinking enum.
UPDATE "ChatMessage"
SET "role" = 'ai'
WHERE "role"::text = 'system';

-- Recreate enum without the deprecated `system` value.
ALTER TYPE "MessageRole" RENAME TO "MessageRole_old";
CREATE TYPE "MessageRole" AS ENUM ('user', 'ai');
ALTER TABLE "ChatMessage"
  ALTER COLUMN "role" TYPE "MessageRole"
  USING ("role"::text::"MessageRole");
DROP TYPE "MessageRole_old";
