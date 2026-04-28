import type { Prisma, PrismaClient, Workspace } from '../../generated/prisma/client';

export type WorkspaceListCursor = {
  updatedAt: Date;
  id: string;
};

export type ListByOwnerPageParams = {
  ownerId: string;
  limit: number;
  cursor?: WorkspaceListCursor | null;
  query?: string | null;
};

export type ListByOwnerPageResult = {
  items: Array<Workspace>;
  nextCursor: WorkspaceListCursor | null;
};

export interface WorkspaceRepository {
  get(id: string): Promise<Workspace | null>;
  listByOwner(ownerId: string): Promise<Array<Workspace>>;
  listByOwnerPage(params: ListByOwnerPageParams): Promise<ListByOwnerPageResult>;
  getOwned(workspaceId: string, ownerId: string): Promise<Workspace | null>;
  updateName(params: { workspaceId: string; name: string }): Promise<Workspace>;
  updateThumbnailAssetUri(params: {
    workspaceId: string;
    thumbnailAssetUri: string | null;
  }): Promise<Workspace>;
  delete(workspaceId: string): Promise<Workspace>;
  create(params: { ownerId: string; name: string }): Promise<Workspace>;
}

export class WorkspaceRepositoryPostgres implements WorkspaceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  get(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({ where: { id } });
  }

  listByOwner(ownerId: string): Promise<Array<Workspace>> {
    return this.prisma.workspace.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async listByOwnerPage(params: ListByOwnerPageParams): Promise<ListByOwnerPageResult> {
    const { ownerId, limit, cursor, query } = params;
    const normalizedQuery = query?.trim() ?? '';
    const baseWhere: Prisma.WorkspaceWhereInput = {
      ownerId,
      ...(normalizedQuery
        ? {
            name: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const paginationWhere: Prisma.WorkspaceWhereInput | undefined = cursor
      ? {
          OR: [
            {
              updatedAt: {
                lt: cursor.updatedAt,
              },
            },
            {
              updatedAt: cursor.updatedAt,
              id: {
                lt: cursor.id,
              },
            },
          ],
        }
      : undefined;

    const where: Prisma.WorkspaceWhereInput = paginationWhere
      ? {
          AND: [baseWhere, paginationWhere],
        }
      : baseWhere;

    const rows = await this.prisma.workspace.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items.at(-1) ?? null;

    return {
      items,
      nextCursor: hasMore && last ? { updatedAt: last.updatedAt, id: last.id } : null,
    };
  }

  getOwned(workspaceId: string, ownerId: string): Promise<Workspace | null> {
    return this.prisma.workspace.findFirst({
      where: { id: workspaceId, ownerId },
    });
  }

  create(params: { ownerId: string; name: string }): Promise<Workspace> {
    return this.prisma.workspace.create({
      data: {
        ownerId: params.ownerId,
        name: params.name,
      },
    });
  }

  updateName(params: { workspaceId: string; name: string }): Promise<Workspace> {
    return this.prisma.workspace.update({
      where: { id: params.workspaceId },
      data: { name: params.name },
    });
  }

  updateThumbnailAssetUri(params: {
    workspaceId: string;
    thumbnailAssetUri: string | null;
  }): Promise<Workspace> {
    return this.prisma.workspace.update({
      where: { id: params.workspaceId },
      data: {
        thumbnailAssetUri: params.thumbnailAssetUri,
      },
    });
  }

  delete(workspaceId: string): Promise<Workspace> {
    return this.prisma.$transaction(async (tx) => {
      await tx.packGenerationJob.deleteMany({ where: { workspaceId } });
      await tx.assetPack.deleteMany({ where: { workspaceId } });
      return tx.workspace.delete({ where: { id: workspaceId } });
    });
  }
}
