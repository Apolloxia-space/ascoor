ALTER TYPE "FileType" RENAME VALUE 'studio_py' TO 'studio_ts';

ALTER TABLE "ProjectFile" RENAME COLUMN "assetUriStl" TO "assetUriGlb";
ALTER TABLE "ProjectFile" RENAME COLUMN "assetUriPy" TO "assetUriTs";
