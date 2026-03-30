import type { Prisma, PrismaClient, DesignJob, DesignStatus } from '../../generated/prisma/client';

export type DesignJobRecord = DesignJob;

export type DesignListCursor = {
  createdAt: Date;
  id: string;
};

export class DesignJobRepositoryPostgres {
  constructor(private readonly prisma: PrismaClient) {}

  create(params: {
    projectId: string;
    userId: string;
    userPrompt: string;
    compiledPrompt?: string | null;
  }): Promise<DesignJob> {
    return this.prisma.designJob.create({
      data: {
        projectId: params.projectId,
        userId: params.userId,
        userPrompt: params.userPrompt,
        compiledPrompt: params.compiledPrompt ?? null,
        status: 'queued',
      },
    });
  }

  countSucceededByUserInPeriod(params: {
    userId: string;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<number> {
    return this.prisma.designJob.count({
      where: {
        userId: params.userId,
        status: 'succeeded',
        finishedAt: {
          gte: params.periodStart,
          lt: params.periodEnd,
        },
      },
    });
  }

  countActiveByUser(userId: string): Promise<number> {
    return this.prisma.designJob.count({
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
            design: {
              previewStatus: 'unverified',
            },
          },
        ],
      },
    });
  }

  get(id: string): Promise<DesignJob | null> {
    return this.prisma.designJob.findUnique({ where: { id } });
  }

  getOwned(userId: string, id: string): Promise<DesignJob | null> {
    return this.prisma.designJob.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  findLatestByDesignOwned(params: { userId: string; designId: string }): Promise<DesignJob | null> {
    return this.prisma.designJob.findFirst({
      where: {
        userId: params.userId,
        designId: params.designId,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async linkDesignIfMissing(params: {
    designId: string;
    resultDesignId: string;
  }): Promise<boolean> {
    const result = await this.prisma.designJob.updateMany({
      where: {
        id: params.designId,
        designId: null,
      },
      data: {
        designId: params.resultDesignId,
        updatedAt: new Date(),
      },
    });
    return result.count > 0;
  }

  async updateCompiledPrompt(params: {
    designId: string;
    compiledPrompt: string;
  }): Promise<boolean> {
    const result = await this.prisma.designJob.updateMany({
      where: {
        id: params.designId,
      },
      data: {
        compiledPrompt: params.compiledPrompt,
        updatedAt: new Date(),
      },
    });
    return result.count > 0;
  }

  async listByProjectOwned(params: {
    userId: string;
    projectId: string;
    statuses?: Array<DesignStatus>;
    limit: number;
    cursor?: DesignListCursor | null;
  }): Promise<{ items: Array<DesignJob>; hasMore: boolean }> {
    const where: Prisma.DesignJobWhereInput = {
      userId: params.userId,
      projectId: params.projectId,
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

    const rows = await this.prisma.designJob.findMany({
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

  listRunningStale(params: { staleBefore: Date; limit: number }): Promise<Array<DesignJob>> {
    return this.prisma.designJob.findMany({
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

  listQueuedStale(params: { staleBefore: Date; limit: number }): Promise<Array<DesignJob>> {
    return this.prisma.designJob.findMany({
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
    const result = await this.prisma.designJob.updateMany({
      where: { id, status: 'queued' },
      data: { status: 'running', startedAt: new Date(), updatedAt: new Date() },
    });
    return result.count > 0;
  }

  async markSucceededIfRunning(params: {
    id: string;
    message: string;
    title: string;
    designId?: string | null;
  }): Promise<boolean> {
    const result = await this.prisma.designJob.updateMany({
      where: { id: params.id, status: 'running' },
      data: {
        status: 'succeeded',
        message: params.message,
        title: params.title,
        designId: params.designId ?? null,
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
  }): Promise<DesignJob> {
    return this.prisma.designJob.update({
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
    designId?: string | null;
  }): Promise<boolean> {
    const result = await this.prisma.designJob.updateMany({
      where: { id: params.id, status: 'running' },
      data: {
        status: 'failed',
        errorMessage: params.errorMessage,
        errorStage: params.errorStage ?? null,
        errorCode: params.errorCode ?? null,
        message: params.message ?? null,
        title: params.title ?? null,
        designId: params.designId,
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
    designId?: string | null;
  }): Promise<boolean> {
    const result = await this.prisma.designJob.updateMany({
      where: { id: params.id, status: 'succeeded' },
      data: {
        status: 'failed',
        errorMessage: params.errorMessage,
        errorStage: params.errorStage ?? null,
        errorCode: params.errorCode ?? null,
        message: params.message ?? null,
        title: params.title ?? null,
        designId: params.designId,
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
    const result = await this.prisma.designJob.updateMany({
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
    const result = await this.prisma.designJob.updateMany({
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
