-- Rename the persisted enum backing design.type to match the design domain.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FileType')
    AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DesignType') THEN
    ALTER TYPE "FileType" RENAME TO "DesignType";
  END IF;
END $$;
