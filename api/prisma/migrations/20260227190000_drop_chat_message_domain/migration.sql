-- Remove unused chat/thread domain persistence.
DROP TABLE IF EXISTS "ChatMessage";
DROP TYPE IF EXISTS "MessageRole";
