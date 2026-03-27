CREATE TYPE "PreviewStatus" AS ENUM ('unverified', 'succeeded', 'failed');

ALTER TABLE "Design"
  ADD COLUMN "previewStatus" "PreviewStatus" NOT NULL DEFAULT 'unverified',
  ADD COLUMN "previewError" TEXT;

UPDATE "Design" AS d
SET
  "previewStatus" = CASE
    WHEN d."assetStatus" = 'failed'::"AssetStatus"
      AND EXISTS (
        SELECT 1
        FROM "DesignJob" AS dj
        WHERE dj."designId" = d."id"
          AND dj."status" = 'succeeded'
      )
      THEN 'failed'::"PreviewStatus"
    ELSE 'unverified'::"PreviewStatus"
  END,
  "previewError" = CASE
    WHEN d."assetStatus" = 'failed'::"AssetStatus"
      AND EXISTS (
        SELECT 1
        FROM "DesignJob" AS dj
        WHERE dj."designId" = d."id"
          AND dj."status" = 'succeeded'
      )
      THEN d."assetError"
    ELSE NULL
  END;

ALTER TABLE "Design"
  DROP COLUMN "assetStatus",
  DROP COLUMN "assetError";

DROP TYPE "AssetStatus";
