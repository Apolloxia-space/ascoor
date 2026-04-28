import type { AssetPack as PrismaAssetPack } from '../generated/prisma/client';

export interface CreateAssetPackInput {
  workspaceId: string;
  ownerId?: string;
  displayName: string;
}

export type AssetPack = PrismaAssetPack;

export type EditedModelSnapshotFields = {
  editedAssetUriGlb?: string | null;
  editedAssetUpdatedAt?: Date | null;
};

export function buildAssetPackObjectPath(params: { assetPackId: string; userId: string }) {
  const objectPath = `users/${params.userId}/assetPacks/${params.assetPackId}.ts`;
  const contentType = 'text/javascript';
  return { objectPath, contentType };
}

export function buildAssetPartObjectPath(params: {
  assetPackId: string;
  partSlug: string;
  userId: string;
}) {
  const objectPath = `users/${params.userId}/assetPacks/${params.assetPackId}/parts/${params.partSlug}.ts`;
  const contentType = 'text/javascript';
  return { objectPath, contentType };
}

export function buildEditedModelObjectPath(params: { assetPackId: string; userId: string }) {
  return `users/${params.userId}/assetPacks/${params.assetPackId}/edited-model.glb`;
}

export function getEditedModelSnapshot(assetPack: EditedModelSnapshotFields) {
  return {
    editedAssetUriGlb: assetPack.editedAssetUriGlb ?? null,
    editedAssetUpdatedAt: assetPack.editedAssetUpdatedAt ?? null,
  };
}
