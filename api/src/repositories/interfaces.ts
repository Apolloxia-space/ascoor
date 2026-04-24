import type { Design, DesignPartStatus, PreviewStatus, Prisma } from '../generated/prisma/client';
import type { GeneratedDesignInfo } from '../entities/designs';
import type { UploadedObjectInfo } from '../entities/storage';

export interface IDesignRepository {
  get(id: string): Promise<Design | null>;
  getOwned(userId: string, id: string): Promise<Design | null>;
  getOwnedByIds(params: { userId: string; ids: Array<string> }): Promise<Array<Design>>;
  list(projectId: string): Promise<Array<Design>>;
  update(params: {
    designId: string;
    assetUriTs: string;
    previewStatus?: PreviewStatus;
  }): Promise<Design>;
  updateDisplayName(params: { designId: string; displayName: string }): Promise<Design>;
  create(params: { projectId: string; displayName: string }): Promise<Design>;
  createAssetPack(params: {
    projectId: string;
    displayName: string;
    packPlan: Prisma.InputJsonValue;
    parts: Array<{
      slug: string;
      displayName: string;
      description?: string | null;
      prompt: string;
      status?: DesignPartStatus;
      assetUriTs?: string | null;
      errorMessage?: string | null;
      sortOrder: number;
    }>;
  }): Promise<Design>;
  listParts(designId: string): Promise<
    Array<{
      id: string;
      designId: string;
      slug: string;
      displayName: string;
      description: string | null;
      prompt: string;
      status: string;
      assetUriTs: string | null;
      errorMessage: string | null;
      sortOrder: number;
      createdAt: Date;
      updatedAt: Date;
    }>
  >;
  createParts(params: {
    designId: string;
    parts: Array<{
      slug: string;
      displayName: string;
      description?: string | null;
      prompt: string;
      status?: DesignPartStatus;
      assetUriTs?: string | null;
      errorMessage?: string | null;
      sortOrder: number;
    }>;
  }): Promise<void>;
  updatePart(params: {
    designId: string;
    slug: string;
    status: DesignPartStatus;
    assetUriTs?: string | null;
    errorMessage?: string | null;
  }): Promise<void>;
  updatePreview(params: {
    designId: string;
    assetUriTs?: string | null;
    previewStatus: PreviewStatus;
    previewError?: string | null;
  }): Promise<Design>;
  updateEditedAsset(params: {
    designId: string;
    editedAssetUriGlb: string | null;
    editedAssetUpdatedAt: Date | null;
  }): Promise<Design>;
  delete(designId: string): Promise<Design>;
}

export interface IGcsRepository {
  upload(params: {
    content: string;
    contentType: string;
    metadata?: Record<string, string>;
    objectPath?: string;
    userId?: string;
    filename?: string;
    ext?: string;
  }): Promise<GeneratedDesignInfo>;
  uploadBinary(params: {
    content: Uint8Array;
    contentType: string;
    metadata?: Record<string, string>;
    objectPath: string;
  }): Promise<UploadedObjectInfo>;
  download(params: {
    objectPath?: string;
    uri?: string;
    userId?: string;
    filename?: string;
    ext?: string;
  }): Promise<string | null>;
  downloadBinary(params: {
    objectPath?: string;
    uri?: string;
    userId?: string;
    filename?: string;
    ext?: string;
  }): Promise<Uint8Array | null>;
  deleteByPrefix(params: { prefix: string }): Promise<void>;
}
