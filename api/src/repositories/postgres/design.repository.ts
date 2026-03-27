import type { PrismaClient, Design, PreviewStatus, Prisma } from '../../generated/prisma/client';
import type { IDesignRepository } from '../interfaces';

export class DesignRepositoryPostgres implements IDesignRepository {
  constructor(private readonly prisma: PrismaClient) {}

  get(id: string): Promise<Design | null> {
    return this.prisma.design.findUnique({ where: { id } });
  }

  async getOwned(userId: string, id: string): Promise<Design | null> {
    return this.prisma.design.findFirst({
      where: {
        id,
        project: { ownerId: userId },
      },
    });
  }

  getOwnedByIds(params: { userId: string; ids: Array<string> }): Promise<Array<Design>> {
    if (params.ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.design.findMany({
      where: {
        id: { in: params.ids },
        project: { ownerId: params.userId },
      },
    });
  }

  list(projectId: string): Promise<Array<Design>> {
    return this.prisma.design.findMany({
      where: { projectId },
      orderBy: [{ displayName: 'asc' }],
    });
  }

  update(params: {
    designId: string;
    assetUriTs: string;
    previewStatus?: PreviewStatus;
  }): Promise<Design> {
    const { designId, assetUriTs, previewStatus = 'unverified' } = params;
    return this.prisma.design.update({
      where: { id: designId },
      data: {
        assetUriTs,
        previewStatus,
        updatedAt: new Date(),
      },
    });
  }

  updateDisplayName(params: { designId: string; displayName: string }): Promise<Design> {
    return this.prisma.design.update({
      where: { id: params.designId },
      data: {
        displayName: params.displayName,
        updatedAt: new Date(),
      },
    });
  }

  create(params: { projectId: string; displayName: string }): Promise<Design> {
    return this.prisma.design.create({
      data: {
        projectId: params.projectId,
        displayName: params.displayName,
        previewStatus: 'unverified',
      },
    });
  }

  updatePreview(params: {
    designId: string;
    assetUriTs?: string | null;
    previewStatus: PreviewStatus;
    previewError?: string | null;
  }): Promise<Design> {
    return this.prisma.design.update({
      where: { id: params.designId },
      data: {
        assetUriTs: params.assetUriTs ?? undefined,
        previewStatus: params.previewStatus,
        previewError: params.previewError ?? null,
        updatedAt: new Date(),
      },
    });
  }

  updateEditedAsset(params: {
    designId: string;
    editedAssetUriGlb: string | null;
    editedAssetUpdatedAt: Date | null;
  }): Promise<Design> {
    const data: Prisma.DesignUpdateInput = {
      editedAssetUriGlb: params.editedAssetUriGlb,
      editedAssetUpdatedAt: params.editedAssetUpdatedAt,
      updatedAt: new Date(),
    };
    return this.prisma.design.update({
      where: { id: params.designId },
      data,
    });
  }

  delete(designId: string): Promise<Design> {
    return this.prisma.design.delete({ where: { id: designId } });
  }
}
