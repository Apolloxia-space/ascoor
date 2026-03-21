CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "mentionedFileIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "GenerationStatus" NOT NULL DEFAULT 'queued',
    "message" TEXT,
    "title" TEXT,
    "hasCode" BOOLEAN,
    "fileId" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id");

CREATE INDEX "GenerationJob_projectId_idx" ON "GenerationJob"("projectId");
CREATE INDEX "GenerationJob_userId_idx" ON "GenerationJob"("userId");
CREATE INDEX "GenerationJob_status_idx" ON "GenerationJob"("status");
CREATE INDEX "GenerationJob_fileId_idx" ON "GenerationJob"("fileId");

ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "ProjectFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
