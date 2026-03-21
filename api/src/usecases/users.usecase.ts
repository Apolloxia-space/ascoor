import type { ExternalCleanupTask, User } from '../generated/prisma/client';
import type { IGcsRepository } from '../repositories/interfaces';
import type { BillingRepository } from '../repositories/postgres/billing.repository';
import type { UserRepository } from '../repositories/postgres/user.repository';
import type { StripeRepository } from '../repositories/stripe/stripe.repository';
import { NotFoundError } from './errors';
import { getAuth } from 'firebase-admin/auth';
import { app as adminApp } from '../infra/firebase-admin';
import { logger } from '../utils/logger';
import { isStripeManagedSubscriptionStatus } from '../utils/subscription';
import { normalizePositiveInt } from '../utils/number';
import { truncateText } from '../utils/text';
import { DEFAULT_FORM_MAX_CHARS } from '../constants/form-limits';
import { normalizeRequiredFormValue } from '../utils/form';
import { ValidationError } from './errors';

const CLEANUP_TASK_MAX_ATTEMPTS = 12;
const CLEANUP_RETRY_BASE_MS = 60_000;
const CLEANUP_RETRY_MAX_MS = 6 * 60 * 60_000;
const CLEANUP_REAP_DEFAULT_LIMIT = 100;
const CLEANUP_REAP_MAX_LIMIT = 500;
const CLEANUP_ERROR_MAX_CHARS = 2000;

function normalizeCleanupReapLimit(limit?: number): number {
  return normalizePositiveInt(limit, {
    defaultValue: CLEANUP_REAP_DEFAULT_LIMIT,
    max: CLEANUP_REAP_MAX_LIMIT,
  });
}

export class UsersUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly billingRepository: BillingRepository,
    private readonly stripeRepository: StripeRepository,
    private readonly gcsRepository: IGcsRepository,
  ) {}

  get(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  /**
   * Create the user if missing (upsert). 呼び出し側で存在確認を行う想定。
   */
  create(params: {
    id: string;
    email?: string | null;
    displayName?: string | null;
  }): Promise<User> {
    return this.userRepository.ensureExists(params);
  }

  async updateDisplayName(id: string, displayName: string): Promise<User> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('user_not_found');
    }
    const normalizedDisplayName = normalizeRequiredFormValue(displayName, {
      field: 'displayName',
      maxChars: DEFAULT_FORM_MAX_CHARS,
      errorFactory: (message) => new ValidationError(message),
    });
    return this.userRepository.updateDisplayName({ id, displayName: normalizedDisplayName });
  }

  async deleteAccount(userId: string): Promise<void> {
    const existing = await this.userRepository.findById(userId);
    if (!existing) {
      throw new NotFoundError('user_not_found');
    }

    const subscription = await this.billingRepository.findSubscriptionByUserId(userId);
    if (subscription && isStripeManagedSubscriptionStatus(subscription.status)) {
      await this.stripeRepository.cancelSubscriptionImmediately({
        subscriptionId: subscription.stripeSubscriptionId,
      });
    }

    const cleanupTask = await this.userRepository.deleteAccountDataAndScheduleCleanup({
      userId,
      gcsPrefix: `users/${userId}/`,
      maxAttempts: CLEANUP_TASK_MAX_ATTEMPTS,
    });

    const claimed = await this.userRepository.claimCleanupTask(cleanupTask.id);
    if (!claimed) {
      logger.warn('account_cleanup_claim_skipped', {
        userId,
        taskId: cleanupTask.id,
      });
      return;
    }

    await this.executeCleanupTask(claimed);
  }

  async reapPendingCleanupTasks(limit?: number): Promise<{
    scanned: number;
    claimed: number;
    succeeded: number;
    retried: number;
    failed: number;
  }> {
    const tasks = await this.userRepository.listDueCleanupTasks(normalizeCleanupReapLimit(limit));

    let claimedCount = 0;
    let succeeded = 0;
    let retried = 0;
    let failed = 0;

    for (const task of tasks) {
      const claimed = await this.userRepository.claimCleanupTask(task.id);
      if (!claimed) {
        continue;
      }
      claimedCount += 1;
      const result = await this.executeCleanupTask(claimed);
      if (result === 'succeeded') {
        succeeded += 1;
      } else if (result === 'retried') {
        retried += 1;
      } else {
        failed += 1;
      }
    }

    return {
      scanned: tasks.length,
      claimed: claimedCount,
      succeeded,
      retried,
      failed,
    };
  }

  private async executeCleanupTask(
    task: ExternalCleanupTask,
  ): Promise<'succeeded' | 'retried' | 'failed'> {
    try {
      await this.gcsRepository.deleteByPrefix({ prefix: task.gcsPrefix });
      await this.deleteFirebaseUser(task.userId);
      await this.userRepository.markCleanupTaskSucceeded(task.id);
      logger.info('account_cleanup_succeeded', {
        taskId: task.id,
        userId: task.userId,
      });
      return 'succeeded';
    } catch (error) {
      const attempts = task.attempts + 1;
      const nextAttemptAt = this.computeNextAttemptAt(attempts);
      const errorMessage = truncateText(
        (error as Error)?.message ?? String(error),
        CLEANUP_ERROR_MAX_CHARS,
      );
      const updatedTask = await this.userRepository.markCleanupTaskRetry({
        taskId: task.id,
        attempts,
        maxAttempts: task.maxAttempts,
        nextAttemptAt,
        errorMessage,
      });
      const isTerminal = updatedTask?.status === 'failed';
      logger.warn(isTerminal ? 'account_cleanup_failed' : 'account_cleanup_retry_scheduled', {
        taskId: task.id,
        userId: task.userId,
        attempts,
        maxAttempts: task.maxAttempts,
        nextAttemptAt: nextAttemptAt.toISOString(),
        error: errorMessage,
      });
      return isTerminal ? 'failed' : 'retried';
    }
  }

  private computeNextAttemptAt(attempts: number): Date {
    const exponent = Math.max(0, Math.min(8, attempts - 1));
    const delayMs = Math.min(CLEANUP_RETRY_MAX_MS, CLEANUP_RETRY_BASE_MS * 2 ** exponent);
    return new Date(Date.now() + delayMs);
  }

  private async deleteFirebaseUser(userId: string): Promise<void> {
    try {
      const auth = getAuth(adminApp);
      await auth.deleteUser(userId);
    } catch (error) {
      const err = error as { code?: string } | undefined;
      if (err?.code === 'auth/user-not-found') {
        return;
      }
      throw error;
    }
  }
}
