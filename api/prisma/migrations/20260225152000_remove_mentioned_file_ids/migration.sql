ALTER TABLE "GenerationJob"
  DROP COLUMN IF EXISTS "mentionedFileIds";

ALTER TABLE "ChatMessage"
  DROP COLUMN IF EXISTS "mentionedFileIds";
