import type { ExternalCleanupTask, PrismaClient, User } from '../../generated/prisma/client';
import { normalizePositiveInt } from '../../utils/number';

const DEFAULT_CLEANUP_MAX_ATTEMPTS = 12;

function normalizeMaxAttempts(value?: number): number {
  return normalizePositiveInt(value, {
    defaultValue: DEFAULT_CLEANUP_MAX_ATTEMPTS,
  });
}

function normalizeBatchLimit(value: number): number {
  return normalizePositiveInt(value, {
    defaultValue: 100,
    max: 500,
  });
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  ensureExists(params: {
    id: string;
    email?: string | null;
    displayName?: string | null;
  }): Promise<User>;
  updateDisplayName(params: { id: string; displayName: string }): Promise<User>;
  deleteAccountDataAndScheduleCleanup(params: {
    userId: string;
    gcsPrefix: string;
    maxAttempts?: number;
  }): Promise<ExternalCleanupTask>;
  listDueCleanupTasks(limit: number): Promise<Array<ExternalCleanupTask>>;
  claimCleanupTask(taskId: string): Promise<ExternalCleanupTask | null>;
  markCleanupTaskSucceeded(taskId: string): Promise<void>;
  markCleanupTaskRetry(params: {
    taskId: string;
    attempts: number;
    maxAttempts: number;
    nextAttemptAt: Date;
    errorMessage: string;
  }): Promise<ExternalCleanupTask | null>;
}

export class UserRepositoryPostgres implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  ensureExists(params: {
    id: string;
    email?: string | null;
    displayName?: string | null;
  }): Promise<User> {
    return this.prisma.user.upsert({
      where: { id: params.id },
      update: {
        email: params.email ?? undefined,
        displayName: params.displayName ?? undefined,
      },
      create: {
        id: params.id,
        email: params.email ?? `${params.id}@placeholder.local`,
        displayName: params.displayName ?? params.id,
      },
    });
  }

  updateDisplayName(params: { id: string; displayName: string }): Promise<User> {
    return this.prisma.user.update({
      where: { id: params.id },
      data: { displayName: params.displayName },
    });
  }

  async deleteAccountDataAndScheduleCleanup(params: {
    userId: string;
    gcsPrefix: string;
    maxAttempts?: number;
  }): Promise<ExternalCleanupTask> {
    return this.prisma.$transaction(async (tx) => {
      const { userId } = params;
      const workspaceIds = await tx.workspace.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
      const workspaceIdList = workspaceIds.map((workspace) => workspace.id);

      if (workspaceIdList.length > 0) {
        await tx.packGenerationJob.deleteMany({
          where: { workspaceId: { in: workspaceIdList } },
        });

        await tx.assetPack.deleteMany({
          where: { workspaceId: { in: workspaceIdList } },
        });

        await tx.workspace.deleteMany({
          where: { id: { in: workspaceIdList } },
        });
      }

      await tx.packGenerationJob.deleteMany({
        where: { userId },
      });

      await tx.subscriptionCancellationFeedback.deleteMany({
        where: { userId },
      });

      await tx.subscription.deleteMany({
        where: { userId },
      });

      await tx.user.delete({
        where: { id: userId },
      });

      return tx.externalCleanupTask.create({
        data: {
          userId,
          gcsPrefix: params.gcsPrefix,
          status: 'pending',
          attempts: 0,
          maxAttempts: normalizeMaxAttempts(params.maxAttempts),
          nextAttemptAt: new Date(),
        },
      });
    });
  }

  listDueCleanupTasks(limit: number): Promise<Array<ExternalCleanupTask>> {
    return this.prisma.externalCleanupTask.findMany({
      where: {
        status: 'pending',
        nextAttemptAt: {
          lte: new Date(),
        },
      },
      orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
      take: normalizeBatchLimit(limit),
    });
  }

  async claimCleanupTask(taskId: string): Promise<ExternalCleanupTask | null> {
    const claimed = await this.prisma.externalCleanupTask.updateMany({
      where: {
        id: taskId,
        status: 'pending',
        nextAttemptAt: {
          lte: new Date(),
        },
      },
      data: {
        status: 'processing',
      },
    });

    if (claimed.count === 0) {
      return null;
    }

    return this.prisma.externalCleanupTask.findUnique({
      where: { id: taskId },
    });
  }

  async markCleanupTaskSucceeded(taskId: string): Promise<void> {
    await this.prisma.externalCleanupTask.update({
      where: { id: taskId },
      data: {
        status: 'succeeded',
        lastError: null,
      },
    });
  }

  async markCleanupTaskRetry(params: {
    taskId: string;
    attempts: number;
    maxAttempts: number;
    nextAttemptAt: Date;
    errorMessage: string;
  }): Promise<ExternalCleanupTask | null> {
    const status = params.attempts >= params.maxAttempts ? 'failed' : 'pending';
    await this.prisma.externalCleanupTask.updateMany({
      where: {
        id: params.taskId,
        status: 'processing',
      },
      data: {
        status,
        attempts: params.attempts,
        nextAttemptAt: params.nextAttemptAt,
        lastError: params.errorMessage,
      },
    });

    return this.prisma.externalCleanupTask.findUnique({
      where: { id: params.taskId },
    });
  }
}
