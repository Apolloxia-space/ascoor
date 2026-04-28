ALTER TYPE "DesignStatus" RENAME TO "PackGenerationStatus";
ALTER TYPE "DesignPartStatus" RENAME TO "AssetPartStatus";

ALTER TABLE IF EXISTS "Project" RENAME TO "Workspace";
ALTER TABLE IF EXISTS "Design" RENAME TO "AssetPack";
ALTER TABLE IF EXISTS "DesignPart" RENAME TO "AssetPart";
ALTER TABLE IF EXISTS "DesignJob" RENAME TO "PackGenerationJob";

ALTER TABLE IF EXISTS "AssetPack" RENAME COLUMN "projectId" TO "workspaceId";
ALTER TABLE IF EXISTS "AssetPack" DROP COLUMN IF EXISTS "stageLayout";

ALTER TABLE IF EXISTS "AssetPart" RENAME COLUMN "designId" TO "assetPackId";

ALTER TABLE IF EXISTS "PackGenerationJob" RENAME COLUMN "projectId" TO "workspaceId";
ALTER TABLE IF EXISTS "PackGenerationJob" RENAME COLUMN "designId" TO "assetPackId";

ALTER TABLE IF EXISTS "PlanCreditAllowance"
  RENAME COLUMN "concurrentDesignLimit" TO "concurrentPackGenerationLimit";

ALTER TABLE IF EXISTS "CreditLedger" RENAME COLUMN "relatedDesignId" TO "relatedAssetPackId";

ALTER INDEX IF EXISTS "Project_pkey" RENAME TO "Workspace_pkey";
ALTER INDEX IF EXISTS "Project_ownerId_idx" RENAME TO "Workspace_ownerId_idx";

ALTER INDEX IF EXISTS "Design_pkey" RENAME TO "AssetPack_pkey";
ALTER INDEX IF EXISTS "Design_projectId_idx" RENAME TO "AssetPack_workspaceId_idx";

ALTER INDEX IF EXISTS "DesignPart_pkey" RENAME TO "AssetPart_pkey";
ALTER INDEX IF EXISTS "DesignPart_designId_slug_key" RENAME TO "AssetPart_assetPackId_slug_key";
ALTER INDEX IF EXISTS "DesignPart_designId_idx" RENAME TO "AssetPart_assetPackId_idx";
ALTER INDEX IF EXISTS "DesignPart_status_idx" RENAME TO "AssetPart_status_idx";

ALTER INDEX IF EXISTS "DesignJob_pkey" RENAME TO "PackGenerationJob_pkey";
ALTER INDEX IF EXISTS "DesignJob_projectId_idx" RENAME TO "PackGenerationJob_workspaceId_idx";
ALTER INDEX IF EXISTS "DesignJob_userId_idx" RENAME TO "PackGenerationJob_userId_idx";
ALTER INDEX IF EXISTS "DesignJob_status_idx" RENAME TO "PackGenerationJob_status_idx";
ALTER INDEX IF EXISTS "DesignJob_designId_idx" RENAME TO "PackGenerationJob_assetPackId_idx";
ALTER INDEX IF EXISTS "DesignJob_errorStage_idx" RENAME TO "PackGenerationJob_errorStage_idx";
ALTER INDEX IF EXISTS "DesignJob_errorCode_idx" RENAME TO "PackGenerationJob_errorCode_idx";

ALTER INDEX IF EXISTS "CreditLedger_relatedDesignId_idx" RENAME TO "CreditLedger_relatedAssetPackId_idx";

ALTER TABLE IF EXISTS "AssetPack"
  RENAME CONSTRAINT "Design_projectId_fkey" TO "AssetPack_workspaceId_fkey";

ALTER TABLE IF EXISTS "AssetPart"
  RENAME CONSTRAINT "DesignPart_designId_fkey" TO "AssetPart_assetPackId_fkey";

ALTER TABLE IF EXISTS "PackGenerationJob"
  RENAME CONSTRAINT "DesignJob_projectId_fkey" TO "PackGenerationJob_workspaceId_fkey";
ALTER TABLE IF EXISTS "PackGenerationJob"
  RENAME CONSTRAINT "DesignJob_userId_fkey" TO "PackGenerationJob_userId_fkey";
ALTER TABLE IF EXISTS "PackGenerationJob"
  RENAME CONSTRAINT "DesignJob_designId_fkey" TO "PackGenerationJob_assetPackId_fkey";
