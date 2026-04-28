import type {
  PrismaClient,
  AssetPack,
  AssetPartStatus,
  PreviewStatus,
  Prisma,
} from '../../generated/prisma/client';
import type { IAssetPackRepository } from '../interfaces';

export class AssetPackRepositoryPostgres implements IAssetPackRepository {
  constructor(private readonly prisma: PrismaClient) {}

  get(id: string): Promise<AssetPack | null> {
    return this.prisma.assetPack.findUnique({ where: { id } });
  }

  async getOwned(userId: string, id: string): Promise<AssetPack | null> {
    return this.prisma.assetPack.findFirst({
      where: {
        id,
        workspace: { ownerId: userId },
      },
    });
  }

  getOwnedByIds(params: { userId: string; ids: Array<string> }): Promise<Array<AssetPack>> {
    if (params.ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.assetPack.findMany({
      where: {
        id: { in: params.ids },
        workspace: { ownerId: params.userId },
      },
    });
  }

  list(workspaceId: string): Promise<Array<AssetPack>> {
    return this.prisma.assetPack.findMany({
      where: { workspaceId },
      orderBy: [{ displayName: 'asc' }],
    });
  }

  update(params: {
    assetPackId: string;
    assetUriTs: string;
    previewStatus?: PreviewStatus;
  }): Promise<AssetPack> {
    const { assetPackId, assetUriTs, previewStatus = 'unverified' } = params;
    return this.prisma.assetPack.update({
      where: { id: assetPackId },
      data: {
        assetUriTs,
        previewStatus,
        updatedAt: new Date(),
      },
    });
  }

  updateDisplayName(params: { assetPackId: string; displayName: string }): Promise<AssetPack> {
    return this.prisma.assetPack.update({
      where: { id: params.assetPackId },
      data: {
        displayName: params.displayName,
        updatedAt: new Date(),
      },
    });
  }

  create(params: { workspaceId: string; displayName: string }): Promise<AssetPack> {
    return this.prisma.assetPack.create({
      data: {
        workspaceId: params.workspaceId,
        displayName: params.displayName,
        previewStatus: 'unverified',
      },
    });
  }

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
  }): Promise<AssetPack> {
    return this.prisma.assetPack.create({
      data: {
        workspaceId: params.workspaceId,
        displayName: params.displayName,
        packPlan: params.packPlan,
        previewStatus: 'unverified',
        parts: {
          create: params.parts.map((part) => ({
            slug: part.slug,
            displayName: part.displayName,
            description: part.description ?? null,
            prompt: part.prompt,
            status: part.status ?? 'pending',
            assetUriTs: part.assetUriTs ?? null,
            errorMessage: part.errorMessage ?? null,
            sortOrder: part.sortOrder,
          })),
        },
      },
    });
  }

  listParts(assetPackId: string) {
    return this.prisma.assetPart.findMany({
      where: { assetPackId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createParts(params: {
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
  }): Promise<void> {
    if (params.parts.length === 0) return;
    await this.prisma.assetPart.createMany({
      data: params.parts.map((part) => ({
        assetPackId: params.assetPackId,
        slug: part.slug,
        displayName: part.displayName,
        description: part.description ?? null,
        prompt: part.prompt,
        status: part.status ?? 'completed',
        assetUriTs: part.assetUriTs ?? null,
        errorMessage: part.errorMessage ?? null,
        sortOrder: part.sortOrder,
      })),
    });
  }

  async updatePart(params: {
    assetPackId: string;
    slug: string;
    status: AssetPartStatus;
    assetUriTs?: string | null;
    errorMessage?: string | null;
  }): Promise<void> {
    await this.prisma.assetPart.update({
      where: {
        assetPackId_slug: {
          assetPackId: params.assetPackId,
          slug: params.slug,
        },
      },
      data: {
        status: params.status,
        assetUriTs: params.assetUriTs,
        errorMessage: params.errorMessage,
        updatedAt: new Date(),
      },
    });
  }

  updatePreview(params: {
    assetPackId: string;
    assetUriTs?: string | null;
    previewStatus: PreviewStatus;
    previewError?: string | null;
  }): Promise<AssetPack> {
    return this.prisma.assetPack.update({
      where: { id: params.assetPackId },
      data: {
        assetUriTs: params.assetUriTs ?? undefined,
        previewStatus: params.previewStatus,
        previewError: params.previewError ?? null,
        updatedAt: new Date(),
      },
    });
  }

  updateEditedAsset(params: {
    assetPackId: string;
    editedAssetUriGlb: string | null;
    editedAssetUpdatedAt: Date | null;
  }): Promise<AssetPack> {
    const data: Prisma.AssetPackUpdateInput = {
      editedAssetUriGlb: params.editedAssetUriGlb,
      editedAssetUpdatedAt: params.editedAssetUpdatedAt,
      updatedAt: new Date(),
    };
    return this.prisma.assetPack.update({
      where: { id: params.assetPackId },
      data,
    });
  }

  delete(assetPackId: string): Promise<AssetPack> {
    return this.prisma.assetPack.delete({ where: { id: assetPackId } });
  }
}
