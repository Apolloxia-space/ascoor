import type { Workspace as PrismaWorkspace } from '../generated/prisma/client';
import { getEditedModelSnapshot, type AssetPack } from './assetPack';

// Workspace entity (re-export from Prisma for use in usecases)
export type Workspace = PrismaWorkspace;

export function buildWorkspaceThumbnailObjectPath(params: { ownerId: string; workspaceId: string }) {
  return `users/${params.ownerId}/workspaces/${params.workspaceId}/thumbnail.webp`;
}

export interface WorkspaceAssetPackSummary {
  id: string;
  workspaceId: string;
  displayName: string;
  previewStatus: AssetPack['previewStatus'];
  assetUriTs: string | null;
  editedAssetUriGlb: string | null;
  previewError: string | null;
  editedAssetUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceAssetPacks {
  workspaceId: string;
  assetPacks: Array<WorkspaceAssetPackSummary>;
}

export function buildWorkspaceAssetPacks(params: {
  workspaceId: string;
  assetPacks: Array<AssetPack>;
}): WorkspaceAssetPacks {
  const assetPackSummaries: Array<WorkspaceAssetPackSummary> = params.assetPacks.map((assetPack) => ({
    ...getEditedModelSnapshot(assetPack),
    id: assetPack.id,
    workspaceId: assetPack.workspaceId,
    displayName: assetPack.displayName,
    previewStatus: assetPack.previewStatus,
    assetUriTs: assetPack.assetUriTs ?? null,
    previewError: assetPack.previewError ?? null,
    createdAt: assetPack.createdAt,
    updatedAt: assetPack.updatedAt,
  }));

  return {
    workspaceId: params.workspaceId,
    assetPacks: assetPackSummaries,
  };
}
