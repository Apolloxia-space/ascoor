-- Rename the persisted file domain objects to design without dropping data.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'ProjectFile'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'Design'
  ) THEN
    ALTER TABLE "ProjectFile" RENAME TO "Design";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProjectFile_pkey'
  ) THEN
    ALTER TABLE "Design" RENAME CONSTRAINT "ProjectFile_pkey" TO "Design_pkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProjectFile_projectId_fkey'
  ) THEN
    ALTER TABLE "Design" RENAME CONSTRAINT "ProjectFile_projectId_fkey" TO "Design_projectId_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'ProjectFile_projectId_idx'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'Design_projectId_idx'
  ) THEN
    ALTER INDEX "ProjectFile_projectId_idx" RENAME TO "Design_projectId_idx";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'ProjectFile_projectId_name_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'Design_projectId_name_key'
  ) THEN
    ALTER INDEX "ProjectFile_projectId_name_key" RENAME TO "Design_projectId_name_key";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'DesignJob'
      AND column_name = 'fileId'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'DesignJob'
      AND column_name = 'designId'
  ) THEN
    ALTER TABLE "DesignJob" RENAME COLUMN "fileId" TO "designId";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GenerationJob_fileId_fkey'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DesignJob_designId_fkey'
  ) THEN
    ALTER TABLE "DesignJob" RENAME CONSTRAINT "GenerationJob_fileId_fkey" TO "DesignJob_designId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DesignJob_fileId_fkey'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DesignJob_designId_fkey'
  ) THEN
    ALTER TABLE "DesignJob" RENAME CONSTRAINT "DesignJob_fileId_fkey" TO "DesignJob_designId_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'GenerationJob_fileId_idx'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'DesignJob_designId_idx'
  ) THEN
    ALTER INDEX "GenerationJob_fileId_idx" RENAME TO "DesignJob_designId_idx";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'DesignJob_fileId_idx'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'DesignJob_designId_idx'
  ) THEN
    ALTER INDEX "DesignJob_fileId_idx" RENAME TO "DesignJob_designId_idx";
  END IF;
END $$;
