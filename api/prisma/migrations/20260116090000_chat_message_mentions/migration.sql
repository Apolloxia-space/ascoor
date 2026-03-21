ALTER TABLE "ChatMessage"
ADD COLUMN "mentionedFileIds" TEXT[] NOT NULL DEFAULT '{}';
