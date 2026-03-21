import type { Design as PrismaDesign } from '../generated/prisma/client';

export interface CreateDesignInput {
  projectId: string;
  ownerId?: string;
  displayName: string;
  type: 'studio_ts';
}

export type Design = PrismaDesign;

export type EditedModelSnapshotFields = {
  editedAssetUriGlb?: string | null;
  editedAssetUpdatedAt?: Date | null;
};

export function designTypeToExt(type: Design['type']): string {
  switch (type) {
    case 'studio_ts':
      return 'ts';
    default:
      return 'ts';
  }
}

export function designTypeToContentType(type: Design['type']): string {
  switch (type) {
    case 'studio_ts':
      return 'text/javascript';
    default:
      return 'text/javascript';
  }
}

export function buildDesignObjectPath(params: { design: Design; userId: string }) {
  const ext = designTypeToExt(params.design.type);
  const contentType = designTypeToContentType(params.design.type);
  const objectPath = `users/${params.userId}/designs/${params.design.id}.${ext}`;
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
