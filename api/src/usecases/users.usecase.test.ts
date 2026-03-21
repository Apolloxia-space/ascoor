import assert from 'node:assert/strict';
import test from 'node:test';

import type { ExternalCleanupTask } from '../generated/prisma/client';
import type { IGcsRepository } from '../repositories/interfaces';
import type { BillingRepository } from '../repositories/postgres/billing.repository';
import type { UserRepository } from '../repositories/postgres/user.repository';
import type { StripeRepository } from '../repositories/stripe/stripe.repository';
import { UsersUsecase } from './users.usecase';

function createCleanupTask(overrides: Partial<ExternalCleanupTask> = {}): ExternalCleanupTask {
  return {
    id: 'cleanup-1',
    userId: 'user-1',
    gcsPrefix: 'users/user-1/',
    status: 'pending',
    attempts: 0,
    maxAttempts: 12,
    nextAttemptAt: new Date('2026-02-14T00:00:00.000Z'),
    lastError: null,
    createdAt: new Date('2026-02-14T00:00:00.000Z'),
    updatedAt: new Date('2026-02-14T00:00:00.000Z'),
    ...overrides,
  };
}

test('deleteAccount cancels active subscription immediately', async () => {
  const immediateCanceledSubscriptionIds: Array<string> = [];
  const task = createCleanupTask();

  const userRepository = {
    findById: async () => ({ id: 'user-1', email: 'u1@example.com' }),
    ensureExists: async () => ({ id: 'user-1', email: 'u1@example.com' }),
    updateDisplayName: async () => ({ id: 'user-1', email: 'u1@example.com' }),
    deleteAccountDataAndScheduleCleanup: async () => task,
    listDueCleanupTasks: async () => [],
    claimCleanupTask: async () => createCleanupTask({ id: task.id, status: 'processing' }),
    markCleanupTaskSucceeded: async (_taskId: string) => undefined,
    markCleanupTaskRetry: async () => {
      throw new Error('markCleanupTaskRetry should not be called');
    },
  } as unknown as UserRepository;

  const billingRepository = {
    findSubscriptionByUserId: async () => ({
      id: 'sub-row-1',
      stripeSubscriptionId: 'sub_active_1',
      status: 'active',
    }),
  } as unknown as BillingRepository;

  const stripeRepository = {
    cancelSubscriptionImmediately: async (params: { subscriptionId: string }) => {
      immediateCanceledSubscriptionIds.push(params.subscriptionId);
    },
    cancelSubscription: async () => {
      throw new Error('cancelSubscription should not be called');
    },
  } as unknown as StripeRepository;

  const gcsRepository = {
    deleteByPrefix: async (_params: { prefix: string }) => undefined,
  } as unknown as IGcsRepository;

  const usecase = new UsersUsecase(
    userRepository,
    billingRepository,
    stripeRepository,
    gcsRepository,
  );
  (
    usecase as unknown as { deleteFirebaseUser: (userId: string) => Promise<void> }
  ).deleteFirebaseUser = async (_userId: string) => undefined;

  await usecase.deleteAccount('user-1');

  assert.deepEqual(immediateCanceledSubscriptionIds, ['sub_active_1']);
});

test('deleteAccount skips Stripe cancellation for non-cancellable status', async () => {
  let immediateCancelCalls = 0;
  const task = createCleanupTask();

  const userRepository = {
    findById: async () => ({ id: 'user-1', email: 'u1@example.com' }),
    ensureExists: async () => ({ id: 'user-1', email: 'u1@example.com' }),
    updateDisplayName: async () => ({ id: 'user-1', email: 'u1@example.com' }),
    deleteAccountDataAndScheduleCleanup: async () => task,
    listDueCleanupTasks: async () => [],
    claimCleanupTask: async () => createCleanupTask({ id: task.id, status: 'processing' }),
    markCleanupTaskSucceeded: async (_taskId: string) => undefined,
    markCleanupTaskRetry: async () => {
      throw new Error('markCleanupTaskRetry should not be called');
    },
  } as unknown as UserRepository;

  const billingRepository = {
    findSubscriptionByUserId: async () => ({
      id: 'sub-row-2',
      stripeSubscriptionId: 'sub_canceled_1',
      status: 'canceled',
    }),
  } as unknown as BillingRepository;

  const stripeRepository = {
    cancelSubscriptionImmediately: async () => {
      immediateCancelCalls += 1;
    },
    cancelSubscription: async () => {
      throw new Error('cancelSubscription should not be called');
    },
  } as unknown as StripeRepository;

  const gcsRepository = {
    deleteByPrefix: async (_params: { prefix: string }) => undefined,
  } as unknown as IGcsRepository;

  const usecase = new UsersUsecase(
    userRepository,
    billingRepository,
    stripeRepository,
    gcsRepository,
  );
  (
    usecase as unknown as { deleteFirebaseUser: (userId: string) => Promise<void> }
  ).deleteFirebaseUser = async (_userId: string) => undefined;

  await usecase.deleteAccount('user-1');

  assert.equal(immediateCancelCalls, 0);
});

test('deleteAccount schedules cleanup and executes it immediately', async () => {
  const scheduled: Array<{ userId: string; gcsPrefix: string }> = [];
  const succeeded: Array<string> = [];
  const gcsPrefixes: Array<string> = [];
  let firebaseDeleteCalls = 0;

  const task = createCleanupTask();

  const userRepository = {
    findById: async () => ({ id: 'user-1', email: 'u1@example.com' }),
    ensureExists: async () => ({ id: 'user-1', email: 'u1@example.com' }),
    updateDisplayName: async () => ({ id: 'user-1', email: 'u1@example.com' }),
    deleteAccountDataAndScheduleCleanup: async (params: { userId: string; gcsPrefix: string }) => {
      scheduled.push(params);
      return task;
    },
    listDueCleanupTasks: async () => [],
    claimCleanupTask: async () => createCleanupTask({ id: task.id, status: 'processing' }),
    markCleanupTaskSucceeded: async (taskId: string) => {
      succeeded.push(taskId);
    },
    markCleanupTaskRetry: async () => {
      throw new Error('markCleanupTaskRetry should not be called');
    },
  } as unknown as UserRepository;

  const billingRepository = {
    findSubscriptionByUserId: async () => null,
  } as unknown as BillingRepository;

  const stripeRepository = {
    cancelSubscription: async () => undefined,
    cancelSubscriptionImmediately: async () => undefined,
  } as unknown as StripeRepository;

  const gcsRepository = {
    deleteByPrefix: async (params: { prefix: string }) => {
      gcsPrefixes.push(params.prefix);
    },
  } as unknown as IGcsRepository;

  const usecase = new UsersUsecase(
    userRepository,
    billingRepository,
    stripeRepository,
    gcsRepository,
  );
  (
    usecase as unknown as { deleteFirebaseUser: (userId: string) => Promise<void> }
  ).deleteFirebaseUser = async (_userId: string) => {
    firebaseDeleteCalls += 1;
  };

  await usecase.deleteAccount('user-1');

  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0]?.userId, 'user-1');
  assert.equal(scheduled[0]?.gcsPrefix, 'users/user-1/');
  assert.deepEqual(gcsPrefixes, ['users/user-1/']);
  assert.equal(firebaseDeleteCalls, 1);
  assert.deepEqual(succeeded, ['cleanup-1']);
});

test('deleteAccount does not fail when cleanup execution fails and schedules retry', async () => {
  const retried: Array<{ taskId: string; attempts: number; errorMessage: string }> = [];
  const task = createCleanupTask();

  const userRepository = {
    findById: async () => ({ id: 'user-1', email: 'u1@example.com' }),
    ensureExists: async () => ({ id: 'user-1', email: 'u1@example.com' }),
    updateDisplayName: async () => ({ id: 'user-1', email: 'u1@example.com' }),
    deleteAccountDataAndScheduleCleanup: async () => task,
    listDueCleanupTasks: async () => [],
    claimCleanupTask: async () => createCleanupTask({ id: task.id, status: 'processing' }),
    markCleanupTaskSucceeded: async () => {
      throw new Error('markCleanupTaskSucceeded should not be called');
    },
    markCleanupTaskRetry: async (params: {
      taskId: string;
      attempts: number;
      maxAttempts: number;
      nextAttemptAt: Date;
      errorMessage: string;
    }) => {
      retried.push({
        taskId: params.taskId,
        attempts: params.attempts,
        errorMessage: params.errorMessage,
      });
      return createCleanupTask({
        id: params.taskId,
        status: 'pending',
        attempts: params.attempts,
        nextAttemptAt: params.nextAttemptAt,
        lastError: params.errorMessage,
      });
    },
  } as unknown as UserRepository;

  const billingRepository = {
    findSubscriptionByUserId: async () => null,
  } as unknown as BillingRepository;

  const stripeRepository = {
    cancelSubscription: async () => undefined,
    cancelSubscriptionImmediately: async () => undefined,
  } as unknown as StripeRepository;

  const gcsRepository = {
    deleteByPrefix: async () => {
      throw new Error('temporary gcs error');
    },
  } as unknown as IGcsRepository;

  const usecase = new UsersUsecase(
    userRepository,
    billingRepository,
    stripeRepository,
    gcsRepository,
  );
  (
    usecase as unknown as { deleteFirebaseUser: (userId: string) => Promise<void> }
  ).deleteFirebaseUser = async (_userId: string) => undefined;

  await assert.doesNotReject(async () => usecase.deleteAccount('user-1'));
  assert.equal(retried.length, 1);
  assert.equal(retried[0]?.taskId, 'cleanup-1');
  assert.equal(retried[0]?.attempts, 1);
  assert.match(retried[0]?.errorMessage ?? '', /temporary gcs error/);
});

test('reapPendingCleanupTasks returns aggregated result counts', async () => {
  const due = [
    createCleanupTask({ id: 'cleanup-ok', userId: 'user-ok', gcsPrefix: 'users/user-ok/' }),
    createCleanupTask({
      id: 'cleanup-failed',
      userId: 'user-failed',
      gcsPrefix: 'users/user-failed/',
    }),
  ];
  const claimedIds: Array<string> = [];
  const succeededIds: Array<string> = [];
  const retryIds: Array<string> = [];

  const userRepository = {
    findById: async () => null,
    ensureExists: async () => ({ id: 'user-1', email: 'u1@example.com' }),
    updateDisplayName: async () => ({ id: 'user-1', email: 'u1@example.com' }),
    deleteAccountDataAndScheduleCleanup: async () => createCleanupTask(),
    listDueCleanupTasks: async () => due,
    claimCleanupTask: async (taskId: string) => {
      claimedIds.push(taskId);
      const task = due.find((item) => item.id === taskId);
      return task ? { ...task, status: 'processing' } : null;
    },
    markCleanupTaskSucceeded: async (taskId: string) => {
      succeededIds.push(taskId);
    },
    markCleanupTaskRetry: async (params: {
      taskId: string;
      attempts: number;
      maxAttempts: number;
      nextAttemptAt: Date;
      errorMessage: string;
    }) => {
      retryIds.push(params.taskId);
      return createCleanupTask({
        id: params.taskId,
        status: 'failed',
        attempts: params.attempts,
        nextAttemptAt: params.nextAttemptAt,
        lastError: params.errorMessage,
      });
    },
  } as unknown as UserRepository;

  const billingRepository = {
    findSubscriptionByUserId: async () => null,
  } as unknown as BillingRepository;

  const stripeRepository = {
    cancelSubscription: async () => undefined,
    cancelSubscriptionImmediately: async () => undefined,
  } as unknown as StripeRepository;

  const gcsRepository = {
    deleteByPrefix: async (params: { prefix: string }) => {
      if (params.prefix.includes('failed')) {
        throw new Error('cleanup failed');
      }
    },
  } as unknown as IGcsRepository;

  const usecase = new UsersUsecase(
    userRepository,
    billingRepository,
    stripeRepository,
    gcsRepository,
  );
  (
    usecase as unknown as { deleteFirebaseUser: (userId: string) => Promise<void> }
  ).deleteFirebaseUser = async (_userId: string) => undefined;

  const summary = await usecase.reapPendingCleanupTasks(50);

  assert.deepEqual(claimedIds, ['cleanup-ok', 'cleanup-failed']);
  assert.deepEqual(succeededIds, ['cleanup-ok']);
  assert.deepEqual(retryIds, ['cleanup-failed']);
  assert.equal(summary.scanned, 2);
  assert.equal(summary.claimed, 2);
  assert.equal(summary.succeeded, 1);
  assert.equal(summary.retried, 0);
  assert.equal(summary.failed, 1);
});
