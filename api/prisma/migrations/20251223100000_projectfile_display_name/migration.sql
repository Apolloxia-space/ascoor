-- Drop legacy unique constraint on file name.
ALTER TABLE "ProjectFile" DROP CONSTRAINT IF EXISTS "ProjectFile_projectId_name_key";

-- Remove legacy name column and add displayName.
ALTER TABLE "ProjectFile" DROP COLUMN IF EXISTS "name";
ALTER TABLE "ProjectFile" ADD COLUMN "displayName" TEXT NOT NULL DEFAULT 'Untitled';
ALTER TABLE "ProjectFile" ALTER COLUMN "displayName" DROP DEFAULT;
