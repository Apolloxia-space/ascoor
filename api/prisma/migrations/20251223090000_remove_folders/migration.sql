-- Drop foreign key and indexes related to folders
ALTER TABLE "ProjectFile" DROP CONSTRAINT IF EXISTS "ProjectFile_folderId_fkey";
DROP INDEX IF EXISTS "ProjectFile_projectId_folderId_name_key";
DROP INDEX IF EXISTS "ProjectFile_folderId_idx";

-- Remove folderId column from project files
ALTER TABLE "ProjectFile" DROP COLUMN IF EXISTS "folderId";

-- Drop folders table
DROP TABLE IF EXISTS "ProjectFolder";

-- Add new unique constraint for project files
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectFile_projectId_name_key" ON "ProjectFile"("projectId", "name");
