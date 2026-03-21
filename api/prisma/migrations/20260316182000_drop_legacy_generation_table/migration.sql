DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Generation') THEN
    IF EXISTS (SELECT 1 FROM "Generation" LIMIT 1) THEN
      RAISE EXCEPTION 'Cannot drop legacy "Generation" table because it still contains rows.';
    END IF;

    DROP TABLE "Generation";
  END IF;
END $$;
