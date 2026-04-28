import type { Prisma, PrismaClient, PackGenerationJob, PackGenerationStatus } from '../../generated/prisma/client';

export type PackGenerationJobRecord = PackGenerationJob;

export type AssetPackListCursor = {
  createdAt: Date;
  id: string;
};

export class PackGenerationJobRepositoryPostgres {
  constructor(private readonly prisma: PrismaClient) {}

  create(params: {
    workspaceId: string;
    userId: string;
    userPrompt: string;
    compiledPrompt?: string | null;
  }): Promise<PackGenerationJob> {
    return this.prisma.packGenerationJob.create({
      data: {
        workspaceId: params.workspaceId,
        userId: params.userId,
        userPrompt: params.userPrompt,
        compiledPrompt: params.compiledPrompt ?? null,
        status: 'queued',
      },
    });
  }

  countActiveByUser(userId: string): Promise<number> {
    return this.prisma.packGenerationJob.count({
      where: {
        userId,
        OR: [
          {
            status: {
              in: ['queued', 'running'],
            },
          },
          {
            status: 'succeeded',
            assetPack: {
              previewStatus: 'unverified',
            },
          },
        ],
      },
    });
  }

  get(id: string): Promise<PackGenerationJob | null> {
    return this.prisma.packGenerationJob.findUnique({ where: { id } });
  }

  getOwned(userId: string, id: string): Promise<PackGenerationJob | null> {
    return this.prisma.packGenerationJob.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  findLatestByAssetPackOwned(params: { userId: string; assetPackId: string }): Promise<PackGenerationJob | null> {
    return this.prisma.packGenerationJob.findFirst({
      where: {
        userId: params.userId,
        assetPackId: params.assetPackId,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async linkAssetPackIfMissing(params: {
    packGenerationJobId: string;
    resultAssetPackId: string;
  }): Promise<boolean> {
    const result = await this.prisma.packGenerationJob.updateMany({
      where: {
        id: params.packGenerationJobId,
        assetPackId: null,
      },
      data: {
        assetPackId: params.resultAssetPackId,
        updatedAt: new Date(),
      },
    });
    return result.count > 0;
  }

  async updateCompiledPrompt(params: {
    packGenerationJobId: string;
    compiledPrompt: string;
  }): Promise<boolean> {
    const result = await this.prisma.packGenerationJob.updateMany({
      where: {
        id: params.packGenerationJobId,
      },
      data: {
        compiledPrompt: params.compiledPrompt,
        updatedAt: new Date(),
      },
    });
    return result.count > 0;
  }

  async listByWorkspaceOwned(params: {
    userId: string;
    workspaceId: string;
    statuses?: Array<PackGenerationStatus>;
    limit: number;
    cursor?: AssetPackListCursor | null;
  }): Promise<{ items: Array<PackGenerationJob>; hasMore: boolean }> {
    const where: Prisma.PackGenerationJobWhereInput = {
      userId: params.userId,
      workspaceId: params.workspaceId,
    };

    if (params.statuses && params.statuses.length > 0) {
      where.status = { in: params.statuses };
    }

    if (params.cursor) {
      where.AND = [
        {
          OR: [
            { createdAt: { lt: params.cursor.createdAt } },
            {
              AND: [{ createdAt: params.cursor.createdAt }, { id: { lt: params.cursor.id } }],
            },
          ],
        },
      ];
    }

    const rows = await this.prisma.packGenerationJob.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: params.limit + 1,
    });

    const hasMore = rows.length > params.limit;
    return {
      items: hasMore ? rows.slice(0, params.limit) : rows,
      hasMore,
    };
  }

  listRunningStale(params: { staleBefore: Date; limit: number }): Promise<Array<PackGenerationJob>> {
    return this.prisma.packGenerationJob.findMany({
      where: {
        status: 'running',
        startedAt: {
          lte: params.staleBefore,
        },
      },
      orderBy: [{ startedAt: 'asc' }, { createdAt: 'asc' }],
      take: params.limit,
    });
  }

  listQueuedStale(params: { staleBefore: Date; limit: number }): Promise<Array<PackGenerationJob>> {
    return this.prisma.packGenerationJob.findMany({
      where: {
        status: 'queued',
        createdAt: {
          lte: params.staleBefore,
        },
      },
      orderBy: [{ createdAt: 'asc' }],
      take: params.limit,
    });
  }

  async markRunning(id: string): Promise<boolean> {
    const result = await this.prisma.packGenerationJob.updateMany({
      where: { id, status: 'queued' },
      data: { status: 'running', startedAt: new Date(), updatedAt: new Date() },
    });
    return result.count > 0;
  }

  async markSucceededIfRunning(params: {
    id: string;
    message: string;
    title: string;
    assetPackId?: string | null;
  }): Promise<boolean> {
    const result = await this.prisma.packGenerationJob.updateMany({
      where: { id: params.id, status: 'running' },
      data: {
        status: 'succeeded',
        message: params.message,
        title: params.title,
        assetPackId: params.assetPackId ?? null,
        errorMessage: null,
        errorStage: null,
        errorCode: null,
        finishedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return result.count > 0;
  }

  markFailed(params: {
    id: string;
    errorMessage: string;
    errorStage?: string | null;
    errorCode?: string | null;
    message?: string | null;
    title?: string | null;
  }): Promise<PackGenerationJob> {
    return this.prisma.packGenerationJob.update({
      where: { id: params.id },
      data: {
        status: 'failed',
        errorMessage: params.errorMessage,
        errorStage: params.errorStage ?? null,
        errorCode: params.errorCode ?? null,
        message: params.message ?? null,
        title: params.title ?? null,
        finishedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async markFailedIfRunning(params: {
    id: string;
    errorMessage: string;
    errorStage?: string | null;
    errorCode?: string | null;
    message?: string | null;
    title?: string | null;
    assetPackId?: string | null;
  }): Promise<boolean> {
    const result = await this.prisma.packGenerationJob.updateMany({
      where: { id: params.id, status: 'running' },
      data: {
        status: 'failed',
        errorMessage: params.errorMessage,
        errorStage: params.errorStage ?? null,
        errorCode: params.errorCode ?? null,
        message: params.message ?? null,
        title: params.title ?? null,
        assetPackId: params.assetPackId,
        finishedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return result.count > 0;
  }

  async markFailedIfSucceeded(params: {
    id: string;
    errorMessage: string;
    errorStage?: string | null;
    errorCode?: string | null;
    message?: string | null;
    title?: string | null;
    assetPackId?: string | null;
  }): Promise<boolean> {
    const result = await this.prisma.packGenerationJob.updateMany({
      where: { id: params.id, status: 'succeeded' },
      data: {
        status: 'failed',
        errorMessage: params.errorMessage,
        errorStage: params.errorStage ?? null,
        errorCode: params.errorCode ?? null,
        message: params.message ?? null,
        title: params.title ?? null,
        assetPackId: params.assetPackId,
        finishedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return result.count > 0;
  }

  async markFailedIfRunningStale(params: {
    id: string;
    staleBefore: Date;
    errorMessage: string;
    errorStage?: string | null;
    errorCode?: string | null;
    message?: string | null;
    title?: string | null;
  }): Promise<boolean> {
    const result = await this.prisma.packGenerationJob.updateMany({
      where: {
        id: params.id,
        status: 'running',
        startedAt: {
          lte: params.staleBefore,
        },
      },
      data: {
        status: 'failed',
        errorMessage: params.errorMessage,
        errorStage: params.errorStage ?? null,
        errorCode: params.errorCode ?? null,
        message: params.message ?? null,
        title: params.title ?? null,
        finishedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return result.count > 0;
  }

  async markFailedIfQueuedStale(params: {
    id: string;
    staleBefore: Date;
    errorMessage: string;
    errorStage?: string | null;
    errorCode?: string | null;
    message?: string | null;
    title?: string | null;
  }): Promise<boolean> {
    const result = await this.prisma.packGenerationJob.updateMany({
      where: {
        id: params.id,
        status: 'queued',
        createdAt: {
          lte: params.staleBefore,
        },
      },
      data: {
        status: 'failed',
        errorMessage: params.errorMessage,
        errorStage: params.errorStage ?? null,
        errorCode: params.errorCode ?? null,
        message: params.message ?? null,
        title: params.title ?? null,
        finishedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return result.count > 0;
  }
}
