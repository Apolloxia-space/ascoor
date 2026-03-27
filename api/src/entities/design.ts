import type { Design as PrismaDesign } from '../generated/prisma/client';

export interface CreateDesignInput {
  projectId: string;
  ownerId?: string;
  displayName: string;
}

export type Design = PrismaDesign;

export type EditedModelSnapshotFields = {
  editedAssetUriGlb?: string | null;
  editedAssetUpdatedAt?: Date | null;
};

export function buildDesignObjectPath(params: { designId: string; userId: string }) {
  const objectPath = `users/${params.userId}/designs/${params.designId}.ts`;
  const contentType = 'text/javascript';
  return { objectPath, contentType };
}

export function buildEditedModelObjectPath(params: { designId: string; userId: string }) {
  return `users/${params.userId}/designs/${params.designId}/edited-model.glb`;
}

export function getEditedModelSnapshot(design: EditedModelSnapshotFields) {
  return {
    editedAssetUriGlb: design.editedAssetUriGlb ?? null,
    editedAssetUpdatedAt: design.editedAssetUpdatedAt ?? null,
  };
}
