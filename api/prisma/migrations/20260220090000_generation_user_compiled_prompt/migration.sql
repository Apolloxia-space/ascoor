-- Split raw user prompt and AI-compiled prompt for generation jobs.
ALTER TABLE "GenerationJob"
ADD COLUMN "userPrompt" TEXT,
ADD COLUMN "compiledPrompt" TEXT;

UPDATE "GenerationJob"
SET
  "userPrompt" = "prompt",
  "compiledPrompt" = "prompt";

ALTER TABLE "GenerationJob"
ALTER COLUMN "userPrompt" SET NOT NULL;

ALTER TABLE "GenerationJob"
DROP COLUMN "prompt";
