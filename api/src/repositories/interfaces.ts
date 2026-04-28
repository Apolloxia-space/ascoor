import type { AssetPack, AssetPartStatus, PreviewStatus, Prisma } from '../generated/prisma/client';
import type { GeneratedAssetPackInfo } from '../entities/assetPacks';
import type { UploadedObjectInfo } from '../entities/storage';

export interface IAssetPackRepository {
  get(id: string): Promise<AssetPack | null>;
  getOwned(userId: string, id: string): Promise<AssetPack | null>;
  getOwnedByIds(params: { userId: string; ids: Array<string> }): Promise<Array<AssetPack>>;
  list(workspaceId: string): Promise<Array<AssetPack>>;
  update(params: {
    assetPackId: string;
    assetUriTs: string;
    previewStatus?: PreviewStatus;
  }): Promise<AssetPack>;
  updateDisplayName(params: { assetPackId: string; displayName: string }): Promise<AssetPack>;
  create(params: { workspaceId: string; displayName: string }): Promise<AssetPack>;
  createAssetPack(params: {
    workspaceId: string;
    displayName: string;
    packPlan: Prisma.InputJsonValue;
    parts: Array<{
      slug: string;
      displayName: string;
      description?: string | null;
      prompt: string;
      status?: AssetPartStatus;
      assetUriTs?: string | null;
      errorMessage?: string | null;
      sortOrder: number;
    }>;
  }): Promise<AssetPack>;
  listParts(assetPackId: string): Promise<
    Array<{
      id: string;
      assetPackId: string;
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
    assetPackId: string;
    parts: Array<{
      slug: string;
      displayName: string;
      description?: string | null;
      prompt: string;
      status?: AssetPartStatus;
      assetUriTs?: string | null;
      errorMessage?: string | null;
      sortOrder: number;
    }>;
  }): Promise<void>;
  updatePart(params: {
    assetPackId: string;
    slug: string;
    status: AssetPartStatus;
    assetUriTs?: string | null;
    errorMessage?: string | null;
  }): Promise<void>;
  updatePreview(params: {
    assetPackId: string;
    assetUriTs?: string | null;
    previewStatus: PreviewStatus;
    previewError?: string | null;
  }): Promise<AssetPack>;
  updateEditedAsset(params: {
    assetPackId: string;
    editedAssetUriGlb: string | null;
    editedAssetUpdatedAt: Date | null;
  }): Promise<AssetPack>;
  delete(assetPackId: string): Promise<AssetPack>;
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
  }): Promise<GeneratedAssetPackInfo>;
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
