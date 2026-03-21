-- Split asset URIs by type and drop legacy columns
ALTER TABLE "ProjectFile" DROP COLUMN "sourceUri";
ALTER TABLE "ProjectFile" DROP COLUMN "assetUri";
ALTER TABLE "ProjectFile" DROP COLUMN "assetMime";

ALTER TABLE "ProjectFile" ADD COLUMN "assetUriJson" TEXT;
ALTER TABLE "ProjectFile" ADD COLUMN "assetUriStl" TEXT;
ALTER TABLE "ProjectFile" ADD COLUMN "assetUriPy" TEXT;
