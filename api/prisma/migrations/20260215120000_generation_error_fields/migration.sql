-- Add persistent failure classification fields for generation jobs.
ALTER TABLE "GenerationJob"
ADD COLUMN "errorStage" TEXT,
ADD COLUMN "errorCode" TEXT;

CREATE INDEX "GenerationJob_errorStage_idx" ON "GenerationJob"("errorStage");
CREATE INDEX "GenerationJob_errorCode_idx" ON "GenerationJob"("errorCode");
