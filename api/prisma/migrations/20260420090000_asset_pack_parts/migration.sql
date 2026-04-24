CREATE TYPE "DesignPartStatus" AS ENUM ('pending', 'generating', 'completed', 'failed');

ALTER TABLE "Design"
  ADD COLUMN "packPlan" JSONB,
  ADD COLUMN "stageLayout" JSONB;

CREATE TABLE "DesignPart" (
  "id" TEXT NOT NULL,
  "designId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "prompt" TEXT NOT NULL,
  "status" "DesignPartStatus" NOT NULL DEFAULT 'pending',
  "assetUriTs" TEXT,
  "errorMessage" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DesignPart_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DesignPart_designId_slug_key" ON "DesignPart"("designId", "slug");
CREATE INDEX "DesignPart_designId_idx" ON "DesignPart"("designId");
CREATE INDEX "DesignPart_status_idx" ON "DesignPart"("status");

ALTER TABLE "DesignPart"
  ADD CONSTRAINT "DesignPart_designId_fkey"
  FOREIGN KEY ("designId") REFERENCES "Design"("id") ON DELETE CASCADE ON UPDATE CASCADE;
