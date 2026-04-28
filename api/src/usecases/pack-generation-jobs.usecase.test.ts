import assert from 'node:assert/strict';
import test from 'node:test';

import { PackGenerationJobsUsecase } from './pack-generation-jobs.usecase';
import type { AiAssetPackInput, AiAssetPackRepository } from '../repositories/ai/assetPack.repository';
import type { IGcsRepository, IAssetPackRepository } from '../repositories/interfaces';
import type { BillingRepository } from '../repositories/postgres/billing.repository';
import type { PackGenerationJobRepositoryPostgres } from '../repositories/postgres/assetPack-job.repository';
import type { WorkspaceRepository } from '../repositories/postgres/workspace.repository';
import type { AssetPackTaskQueue } from '../infra/assetPack-task-queue';
import { AssetPackConcurrencyLimitExceededError, AssetPackQuotaExceededError } from './errors';
import { AssetPackPipelineError, type AssetPackPipelineService } from '../services/assetPacks/assetPack-pipeline.service';

type TestJob = {
  id: string;
  workspaceId: string;
  userId: string;
  userPrompt: string;
  compiledPrompt: string | null;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  message: string | null;
  title: string | null;
  assetPackId: string | null;
  errorMessage: string | null;
  errorStage: string | null;
  errorCode: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type UploadBinaryParams = {
  content: Uint8Array;
  contentType: string;
  metadata?: Record<string, string>;
  objectPath: string;
};

type MarkSucceededParams = {
  id: string;
  message: string;
  title: string;
  assetPackId?: string | null;
};

type MarkFailedIfRunningParams = {
  id: string;
  errorMessage: string;
  message?: string | null;
  title?: string | null;
  assetPackId?: string | null;
  errorCode?: string | null;
};

type MarkFailedIfRunningStaleParams = {
  id: string;
  staleBefore: Date;
  errorMessage: string;
  message?: string | null;
  title?: string | null;
};

type PlanKey = 'free' | 'hobby' | 'pro';

function billingCreditMethods(balance = 100, granted = 100) {
  return {
    sumCreditAmountByUserInPeriod: async (params: { reason?: string }) =>
      params.reason === 'monthly_grant' ? granted : balance,
    createCreditLedgerEntryIfFirst: async () => true,
    consumeCreditsIfAvailable: async () => true,
  };
}

function inferErrorCodeForTest(
  usecase: PackGenerationJobsUsecase,
  error: unknown,
  fallback: string,
): string {
  const helper = usecase as unknown as {
    inferErrorCode: (sourceError: unknown, sourceFallback: string) => string;
  };
  return helper.inferErrorCode(error, fallback);
}

function createJob(overrides: Partial<TestJob> = {}): TestJob {
  return {
    id: 'gen-1',
    workspaceId: 'proj-1',
    userId: 'user-1',
    userPrompt: 'create bracket',
    compiledPrompt: null,
    status: 'running',
    message: null,
    title: null,
    assetPackId: null,
    errorMessage: null,
    errorStage: null,
    errorCode: null,
    startedAt: new Date('2026-02-12T00:00:00.000Z'),
    finishedAt: null,
    createdAt: new Date('2026-02-12T00:00:00.000Z'),
    updatedAt: new Date('2026-02-12T00:00:00.000Z'),
    ...overrides,
  };
}

function createPipelineServiceStub(params: {
  result?: { message: string; title: string; assetPackId: string };
  error?: AssetPackPipelineError;
}): AssetPackPipelineService {
  return {
    run: async () => {
      if (params.error) throw params.error;
      return (
        params.result ?? {
          message: 'Generated bracket.',
          title: 'Bracket',
          assetPackId: 'file-1',
        }
      );
    },
  } as unknown as AssetPackPipelineService;
}

test('process succeeds and marks assetPack as succeeded', async () => {
  const markSucceededCalls: Array<{
    id: string;
    message: string;
    title: string;
    assetPackId?: string | null;
  }> = [];
  const markFailedCalls: Array<{ id: string; errorMessage: string }> = [];
  const uploadBinaryCalls: Array<{ objectPath: string; contentType: string }> = [];

  const job = createJob({ status: 'running' });
  const createdFile = {
    id: 'file-1',
    workspaceId: 'proj-1',
    displayName: 'Bracket',
    type: 'studio_ts',
  };

  const usecase = new PackGenerationJobsUsecase(
    {
      assetPack: async () => ({
        title: 'Bracket',
        message: 'Generated bracket.',
        code: 'const result = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshStandardMaterial({ color: 0x6ea8fe }));',
      }),
    } as unknown as AiAssetPackRepository,
    {
      create: async () => createdFile,
      update: async () => ({ ...createdFile }),
      updatePreview: async () => ({ ...createdFile }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => createdFile,
      delete: async () => createdFile,
    } as unknown as IAssetPackRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as WorkspaceRepository,
    {
      upload: async () => ({
        bucket: 'b',
        filename: 'f.ts',
        gcsUri: 'gs://bucket/file.ts',
        content: '',
      }),
      uploadBinary: async (params: UploadBinaryParams) => {
        uploadBinaryCalls.push({ objectPath: params.objectPath, contentType: params.contentType });
        return { bucket: 'b', objectPath: params.objectPath, gcsUri: 'gs://bucket/file.glb' };
      },
      download: async () => null,
      downloadBinary: async () => null,
      deleteByPrefix: async () => {},
    } as unknown as IGcsRepository,
    {
      markRunning: async () => true,
      get: async () => job,
      markSucceededIfRunning: async (params: MarkSucceededParams) => {
        markSucceededCalls.push(params);
        return true;
      },
      markFailedIfRunning: async (params: MarkFailedIfRunningParams) => {
        markFailedCalls.push({ id: params.id, errorMessage: params.errorMessage });
        return true;
      },
      create: async () => createJob({ status: 'queued' }),
      getOwned: async () => null,
      markFailed: async () => createJob({ status: 'failed' }),
      markFailedIfRunningStale: async () => false,
      listRunningStale: async () => [],
      linkAssetPackIfMissing: async () => true,
    } as unknown as PackGenerationJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => null,
      ...billingCreditMethods(),
      findPlanCreditAllowance: async () => ({
        planKey: 'pro',
        monthlyCredits: 100,
        concurrentPackGenerationLimit: 3,
      }),
    } as unknown as BillingRepository,
    undefined,
    undefined,
    createPipelineServiceStub({
      result: {
        message: 'Generated bracket.',
        title: 'Bracket',
        assetPackId: 'file-1',
      },
    }),
  );

  await usecase.execute({ type: 'process', packGenerationJobId: 'gen-1' });

  assert.equal(markSucceededCalls.length, 1);
  assert.equal(markSucceededCalls[0]?.id, 'gen-1');
  assert.equal(markSucceededCalls[0]?.assetPackId, 'file-1');
  assert.equal(markFailedCalls.length, 0);
  assert.equal(uploadBinaryCalls.length, 0);
});

test('process marks failed when AI returns no executable code', async () => {
  const markFailedCalls: Array<{ id: string; errorMessage: string; assetPackId?: string | null }> = [];

  const usecase = new PackGenerationJobsUsecase(
    {
      assetPack: async () => ({
        title: 'Broken',
        message: 'No code output.',
        code: '',
      }),
    } as unknown as AiAssetPackRepository,
    {
      create: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'Broken',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'Broken',
        type: 'studio_ts',
      }),
      updatePreview: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'Broken',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'Broken',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'Broken',
        type: 'studio_ts',
      }),
    } as unknown as IAssetPackRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as WorkspaceRepository,
    {
      upload: async () => ({
        bucket: 'b',
        filename: 'f.ts',
        gcsUri: 'gs://bucket/file.ts',
        content: '',
      }),
      uploadBinary: async () => ({ bucket: 'b', objectPath: 'o', gcsUri: 'gs://bucket/file.glb' }),
      download: async () => null,
      downloadBinary: async () => null,
      deleteByPrefix: async () => {},
    } as unknown as IGcsRepository,
    {
      markRunning: async () => true,
      get: async () => createJob({ status: 'running' }),
      markSucceededIfRunning: async () => true,
      markFailedIfRunning: async (params: MarkFailedIfRunningParams) => {
        markFailedCalls.push({
          id: params.id,
          errorMessage: params.errorMessage,
          assetPackId: params.assetPackId,
        });
        return true;
      },
      create: async () => createJob({ status: 'queued' }),
      getOwned: async () => null,
      markFailed: async () => createJob({ status: 'failed' }),
      markFailedIfRunningStale: async () => false,
      listRunningStale: async () => [],
      linkAssetPackIfMissing: async () => true,
    } as unknown as PackGenerationJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => null,
      ...billingCreditMethods(),
      findPlanCreditAllowance: async () => ({
        planKey: 'pro',
        monthlyCredits: 100,
        concurrentPackGenerationLimit: 3,
      }),
    } as unknown as BillingRepository,
    undefined,
    undefined,
    createPipelineServiceStub({
      error: new AssetPackPipelineError(
        'AI_AGENT_INVOKE',
        'AI_AGENT_EMPTY_CODE',
        'Asset pack generation did not return executable code.',
      ),
    }),
  );

  await usecase.execute({ type: 'process', packGenerationJobId: 'gen-1' });

  assert.equal(markFailedCalls.length, 1);
  assert.equal(markFailedCalls[0]?.id, 'gen-1');
  assert.equal(markFailedCalls[0]?.assetPackId, undefined);
  assert.equal(markFailedCalls[0]?.errorMessage, 'Asset pack generation did not return executable code.');
});

test('process succeeds without runtime execution and links generated assetPack', async () => {
  const markFailedCalls: Array<{
    id: string;
    errorMessage: string;
    assetPackId?: string | null;
    errorCode?: string | null;
  }> = [];
  const markSucceededCalls: Array<{ id: string; assetPackId: string | null }> = [];
  const aiInvokeCalls: Array<{
    prompt: string;
  }> = [];

  const usecase = new PackGenerationJobsUsecase(
    {
      assetPack: async (params: AiAssetPackInput) => {
        aiInvokeCalls.push({
          prompt: params.prompt,
        });
        return {
          title: 'Broken bracket',
          message: 'execution failed',
          code: 'const result = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshStandardMaterial({ color: 0x6ea8fe }));',
        };
      },
    } as unknown as AiAssetPackRepository,
    {
      create: async () => ({
        id: 'file-failed-1',
        workspaceId: 'proj-1',
        displayName: 'Broken bracket',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-failed-1',
        workspaceId: 'proj-1',
        displayName: 'Broken bracket',
        type: 'studio_ts',
      }),
      updatePreview: async () => ({
        id: 'file-failed-1',
        workspaceId: 'proj-1',
        displayName: 'Broken bracket',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-failed-1',
        workspaceId: 'proj-1',
        displayName: 'Broken bracket',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-failed-1',
        workspaceId: 'proj-1',
        displayName: 'Broken bracket',
        type: 'studio_ts',
      }),
    } as unknown as IAssetPackRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as WorkspaceRepository,
    {
      upload: async () => ({
        bucket: 'b',
        filename: 'f.ts',
        gcsUri: 'gs://bucket/file.ts',
        content: '',
      }),
      uploadBinary: async () => ({ bucket: 'b', objectPath: 'o', gcsUri: 'gs://bucket/file.glb' }),
      download: async () => null,
      downloadBinary: async () => null,
      deleteByPrefix: async () => {},
    } as unknown as IGcsRepository,
    {
      markRunning: async () => true,
      get: async () => createJob({ status: 'running' }),
      markSucceededIfRunning: async (params: MarkSucceededParams) => {
        markSucceededCalls.push({
          id: params.id,
          assetPackId: params.assetPackId ?? null,
        });
        return true;
      },
      markFailedIfRunning: async (params: MarkFailedIfRunningParams) => {
        markFailedCalls.push({
          id: params.id,
          errorMessage: params.errorMessage,
          assetPackId: params.assetPackId,
          errorCode: params.errorCode,
        });
        return true;
      },
      create: async () => createJob({ status: 'queued' }),
      getOwned: async () => null,
      markFailed: async () => createJob({ status: 'failed' }),
      markFailedIfRunningStale: async () => false,
      listRunningStale: async () => [],
      linkAssetPackIfMissing: async () => true,
    } as unknown as PackGenerationJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => null,
      ...billingCreditMethods(),
      findPlanCreditAllowance: async () => ({
        planKey: 'pro',
        monthlyCredits: 100,
        concurrentPackGenerationLimit: 3,
      }),
    } as unknown as BillingRepository,
    undefined,
    undefined,
    createPipelineServiceStub({
      result: {
        message: 'execution failed',
        title: 'Broken bracket',
        assetPackId: 'file-failed-1',
      },
    }),
  );

  await usecase.execute({ type: 'process', packGenerationJobId: 'gen-1' });

  assert.equal(markFailedCalls.length, 0);
  assert.equal(markSucceededCalls.length, 1);
  assert.equal(markSucceededCalls[0]?.id, 'gen-1');
  assert.equal(markSucceededCalls[0]?.assetPackId, 'file-failed-1');
  assert.equal(aiInvokeCalls.length, 0);
  assert.equal(
    inferErrorCodeForTest(
      usecase,
      'ExecutionError: The result variable was not found. Assign the final shape to result.',
      'UNKNOWN',
    ),
    'AI_AGENT_ASSET_PACK_FAILED',
  );
  assert.equal(inferErrorCodeForTest(usecase, 'workspace not found', 'UNKNOWN'), 'WORKSPACE_NOT_FOUND');
});

test('process does not recover stale pack generation job when claimed by another worker', async () => {
  const staleRecoverCalls: Array<{ id: string; errorMessage: string }> = [];
  let getCalls = 0;

  const staleJob = createJob({
    status: 'running',
    startedAt: new Date(Date.now() - 60_000),
  });
  const failedJob = createJob({
    status: 'failed',
    errorMessage: 'Pack generation timed out while processing.',
    startedAt: staleJob.startedAt,
  });

  const usecase = new PackGenerationJobsUsecase(
    {
      assetPack: async () => ({
        title: 'n/a',
        message: 'n/a',
        code: 'n/a',
      }),
    } as unknown as AiAssetPackRepository,
    {
      create: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      updatePreview: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
    } as unknown as IAssetPackRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as WorkspaceRepository,
    {
      upload: async () => ({
        bucket: 'b',
        filename: 'f.ts',
        gcsUri: 'gs://bucket/file.ts',
        content: '',
      }),
      uploadBinary: async () => ({ bucket: 'b', objectPath: 'o', gcsUri: 'gs://bucket/file.glb' }),
      download: async () => null,
      downloadBinary: async () => null,
      deleteByPrefix: async () => {},
    } as unknown as IGcsRepository,
    {
      markRunning: async () => false,
      get: async () => {
        getCalls += 1;
        return getCalls === 1 ? staleJob : failedJob;
      },
      markSucceededIfRunning: async () => true,
      markFailedIfRunning: async () => true,
      create: async () => createJob({ status: 'queued' }),
      getOwned: async () => null,
      markFailed: async () => createJob({ status: 'failed' }),
      markFailedIfRunningStale: async (params: MarkFailedIfRunningStaleParams) => {
        staleRecoverCalls.push({ id: params.id, errorMessage: params.errorMessage });
        return true;
      },
      listRunningStale: async () => [],
      listQueuedStale: async () => [],
      markFailedIfQueuedStale: async () => false,
      linkAssetPackIfMissing: async () => true,
    } as unknown as PackGenerationJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => null,
      ...billingCreditMethods(),
      findPlanCreditAllowance: async () => ({
        planKey: 'pro',
        monthlyCredits: 100,
        concurrentPackGenerationLimit: 3,
      }),
    } as unknown as BillingRepository,
    undefined,
  );

  await usecase.execute({ type: 'process', packGenerationJobId: 'gen-1' });

  assert.equal(staleRecoverCalls.length, 0);
  assert.equal(getCalls, 1);
});

test('enqueue marks failed when task queue enqueue throws', async () => {
  const enqueueCalls: Array<string> = [];
  const markFailedCalls: Array<{ id: string; errorMessage: string }> = [];

  const createdJob = createJob({ status: 'queued' });

  const usecase = new PackGenerationJobsUsecase(
    {
      assetPack: async () => ({
        title: 'n/a',
        message: 'n/a',
        code: 'n/a',
      }),
    } as unknown as AiAssetPackRepository,
    {
      create: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      updatePreview: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
    } as unknown as IAssetPackRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as WorkspaceRepository,
    {
      upload: async () => ({
        bucket: 'b',
        filename: 'f.ts',
        gcsUri: 'gs://bucket/file.ts',
        content: '',
      }),
      uploadBinary: async () => ({ bucket: 'b', objectPath: 'o', gcsUri: 'gs://bucket/file.glb' }),
      download: async () => null,
      downloadBinary: async () => null,
      deleteByPrefix: async () => {},
    } as unknown as IGcsRepository,
    {
      countActiveByUser: async () => 0,
      markRunning: async () => true,
      get: async () => createJob({ status: 'running' }),
      markSucceededIfRunning: async () => true,
      markFailedIfRunning: async () => true,
      create: async () => createdJob,
      getOwned: async () => null,
      markFailed: async (params: MarkFailedIfRunningParams) => {
        markFailedCalls.push({ id: params.id, errorMessage: params.errorMessage });
        return createJob({ status: 'failed', errorMessage: params.errorMessage });
      },
      markFailedIfRunningStale: async () => false,
      listRunningStale: async () => [],
      linkAssetPackIfMissing: async () => true,
    } as unknown as PackGenerationJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => ({ status: 'active' }) as never,
      ...billingCreditMethods(),
      findPlanCreditAllowance: async (planKey: PlanKey) => ({
        planKey,
        monthlyCredits: 100,
        concurrentPackGenerationLimit: 3,
      }),
    } as unknown as BillingRepository,
    {
      isEnabled: () => true,
      enqueue: async (assetPackId: string) => {
        enqueueCalls.push(assetPackId);
        throw new Error('enqueue exploded');
      },
    } as unknown as AssetPackTaskQueue,
  );

  const response = await usecase.execute({
    type: 'enqueue',
    input: {
      workspaceId: 'proj-1',
      userPrompt: 'make bracket',
      userId: 'user-1',
    },
  });

  assert.equal(response.packGenerationJobId, 'gen-1');
  assert.equal(enqueueCalls.length, 1);
  assert.equal(enqueueCalls[0], 'gen-1');
  assert.equal(markFailedCalls.length, 1);
  assert.match(markFailedCalls[0]?.errorMessage ?? '', /Failed to enqueue pack generation task/);
});

test('enqueue throws quota exceeded error when credit balance is insufficient', async () => {
  const usecase = new PackGenerationJobsUsecase(
    {
      assetPack: async () => ({ title: 'n/a', message: 'n/a', code: 'n/a' }),
    } as unknown as AiAssetPackRepository,
    {
      create: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      updatePreview: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
    } as unknown as IAssetPackRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as WorkspaceRepository,
    {
      upload: async () => ({
        bucket: 'b',
        filename: 'f.ts',
        gcsUri: 'gs://bucket/file.ts',
        content: '',
      }),
      uploadBinary: async () => ({ bucket: 'b', objectPath: 'o', gcsUri: 'gs://bucket/file.glb' }),
      download: async () => null,
      downloadBinary: async () => null,
      deleteByPrefix: async () => {},
    } as unknown as IGcsRepository,
    {
      countActiveByUser: async () => 0,
      markRunning: async () => true,
      get: async () => createJob({ status: 'running' }),
      markSucceededIfRunning: async () => true,
      markFailedIfRunning: async () => true,
      create: async () => createJob({ status: 'queued' }),
      getOwned: async () => null,
      markFailed: async () => createJob({ status: 'failed' }),
      markFailedIfRunningStale: async () => false,
      listRunningStale: async () => [],
      listQueuedStale: async () => [],
      markFailedIfQueuedStale: async () => false,
      linkAssetPackIfMissing: async () => true,
    } as unknown as PackGenerationJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => ({ status: 'active' }) as never,
      ...billingCreditMethods(0, 100),
      findPlanCreditAllowance: async () => ({
        planKey: 'pro',
        monthlyCredits: 100,
        concurrentPackGenerationLimit: 3,
      }),
    } as unknown as BillingRepository,
    undefined,
  );

  await assert.rejects(
    () =>
      usecase.execute({
        type: 'enqueue',
        input: {
          workspaceId: 'proj-1',
          userPrompt: 'make bracket',
          userId: 'user-1',
        },
      }),
    (error: unknown) => {
      assert(error instanceof AssetPackQuotaExceededError);
      assert.equal(error.code, 'credit_balance_insufficient');
      return true;
    },
  );
});

test('enqueue resolves only the Pro credit allowance', async () => {
  const planLookups: Array<PlanKey> = [];
  let createCalls = 0;

  const usecase = new PackGenerationJobsUsecase(
    {
      assetPack: async () => ({ title: 'n/a', message: 'n/a', code: 'n/a' }),
    } as unknown as AiAssetPackRepository,
    {
      create: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      updatePreview: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
    } as unknown as IAssetPackRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as WorkspaceRepository,
    {
      upload: async () => ({
        bucket: 'b',
        filename: 'f.ts',
        gcsUri: 'gs://bucket/file.ts',
        content: '',
      }),
      uploadBinary: async () => ({ bucket: 'b', objectPath: 'o', gcsUri: 'gs://bucket/file.glb' }),
      download: async () => null,
      downloadBinary: async () => null,
      deleteByPrefix: async () => {},
    } as unknown as IGcsRepository,
    {
      countActiveByUser: async () => 2,
      markRunning: async () => true,
      get: async () => createJob({ status: 'running' }),
      markSucceededIfRunning: async () => true,
      markFailedIfRunning: async () => true,
      create: async () => {
        createCalls += 1;
        return createJob({ status: 'queued' });
      },
      getOwned: async () => null,
      markFailed: async () => createJob({ status: 'failed' }),
      markFailedIfRunningStale: async () => false,
      listRunningStale: async () => [],
      listQueuedStale: async () => [],
      markFailedIfQueuedStale: async () => false,
      linkAssetPackIfMissing: async () => true,
    } as unknown as PackGenerationJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => ({ status: 'active', planId: 'plan-pro' }) as never,
      findPlanById: async () => ({ key: 'pro' }) as never,
      ...billingCreditMethods(),
      findPlanCreditAllowance: async (planKey: PlanKey) => {
        planLookups.push(planKey);
        return { planKey, monthlyCredits: 100, concurrentPackGenerationLimit: 3 };
      },
    } as unknown as BillingRepository,
    {
      isEnabled: () => true,
      enqueue: async () => {},
    } as unknown as AssetPackTaskQueue,
  );

  await usecase.execute({
    type: 'enqueue',
    input: {
      workspaceId: 'proj-1',
      userPrompt: 'make bracket',
      userId: 'user-1',
    },
  });

  assert.deepEqual(planLookups, ['pro']);
  assert.equal(createCalls, 1);
});

test('enqueue throws concurrency exceeded error when active pack generation jobs reach the plan limit', async () => {
  const usecase = new PackGenerationJobsUsecase(
    {
      assetPack: async () => ({ title: 'n/a', message: 'n/a', code: 'n/a' }),
    } as unknown as AiAssetPackRepository,
    {
      create: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      updatePreview: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
    } as unknown as IAssetPackRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as WorkspaceRepository,
    {
      upload: async () => ({
        bucket: 'b',
        filename: 'f.ts',
        gcsUri: 'gs://bucket/file.ts',
        content: '',
      }),
      uploadBinary: async () => ({ bucket: 'b', objectPath: 'o', gcsUri: 'gs://bucket/file.glb' }),
      download: async () => null,
      downloadBinary: async () => null,
      deleteByPrefix: async () => {},
    } as unknown as IGcsRepository,
    {
      countActiveByUser: async () => 3,
      markRunning: async () => true,
      get: async () => createJob({ status: 'running' }),
      markSucceededIfRunning: async () => true,
      markFailedIfRunning: async () => true,
      create: async () => createJob({ status: 'queued' }),
      getOwned: async () => null,
      markFailed: async () => createJob({ status: 'failed' }),
      markFailedIfRunningStale: async () => false,
      listRunningStale: async () => [],
      listQueuedStale: async () => [],
      markFailedIfQueuedStale: async () => false,
      linkAssetPackIfMissing: async () => true,
    } as unknown as PackGenerationJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => ({ status: 'active' }) as never,
      ...billingCreditMethods(),
      findPlanCreditAllowance: async () => ({
        planKey: 'pro',
        monthlyCredits: 100,
        concurrentPackGenerationLimit: 3,
      }),
    } as unknown as BillingRepository,
    undefined,
  );

  await assert.rejects(
    () =>
      usecase.execute({
        type: 'enqueue',
        input: {
          workspaceId: 'proj-1',
          userPrompt: 'make bracket',
          userId: 'user-1',
        },
      }),
    (error: unknown) => {
      assert(error instanceof AssetPackConcurrencyLimitExceededError);
      assert.equal(error.code, 'pack_generation_concurrency_limit_exceeded');
      return true;
    },
  );
});

test('reap stale also recovers queued assetPacks', async () => {
  const queuedRecoverCalls: Array<{ id: string; errorMessage: string }> = [];
  const queuedJob = createJob({
    id: 'gen-queued-1',
    status: 'queued',
    startedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const usecase = new PackGenerationJobsUsecase(
    {
      assetPack: async () => ({ title: 'n/a', message: 'n/a', code: 'n/a' }),
    } as unknown as AiAssetPackRepository,
    {
      create: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      updatePreview: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
    } as unknown as IAssetPackRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as WorkspaceRepository,
    {
      upload: async () => ({
        bucket: 'b',
        filename: 'f.ts',
        gcsUri: 'gs://bucket/file.ts',
        content: '',
      }),
      uploadBinary: async () => ({ bucket: 'b', objectPath: 'o', gcsUri: 'gs://bucket/file.glb' }),
      download: async () => null,
      downloadBinary: async () => null,
      deleteByPrefix: async () => {},
    } as unknown as IGcsRepository,
    {
      markRunning: async () => false,
      get: async () => queuedJob,
      markSucceededIfRunning: async () => true,
      markFailedIfRunning: async () => true,
      create: async () => createJob({ status: 'queued' }),
      getOwned: async () => queuedJob,
      markFailed: async () => createJob({ status: 'failed' }),
      markFailedIfRunningStale: async () => false,
      listRunningStale: async () => [],
      listQueuedStale: async () => [queuedJob],
      markFailedIfQueuedStale: async (params: MarkFailedIfRunningStaleParams) => {
        queuedRecoverCalls.push({ id: params.id, errorMessage: params.errorMessage });
        return true;
      },
      linkAssetPackIfMissing: async () => true,
    } as unknown as PackGenerationJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => null,
      ...billingCreditMethods(),
      findPlanCreditAllowance: async (planKey: PlanKey) => ({
        planKey,
        monthlyCredits: 100,
      }),
    } as unknown as BillingRepository,
    undefined,
  );

  const result = await usecase.maintenance({ type: 'reapStaleRunning', limit: 50 });

  assert.equal(result.scannedRunning, 0);
  assert.equal(result.scannedQueued, 1);
  assert.equal(result.reapedRunning, 0);
  assert.equal(result.reapedQueued, 1);
  assert.equal(result.reaped, 1);
  assert.equal(queuedRecoverCalls.length, 1);
  assert.equal(queuedRecoverCalls[0]?.id, 'gen-queued-1');
});

test('enqueue creates a pack generation job when credits are available', async () => {
  let createCalls = 0;

  const usecase = new PackGenerationJobsUsecase(
    {
      assetPack: async () => ({
        title: 'n/a',
        message: 'n/a',
        code: 'const result = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshStandardMaterial({ color: 0x6ea8fe }));',
      }),
    } as unknown as AiAssetPackRepository,
    {
      create: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      updatePreview: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
    } as unknown as IAssetPackRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as WorkspaceRepository,
    {
      upload: async () => ({
        bucket: 'b',
        filename: 'f.ts',
        gcsUri: 'gs://bucket/file.ts',
        content: '',
      }),
      uploadBinary: async () => ({ bucket: 'b', objectPath: 'o', gcsUri: 'gs://bucket/file.glb' }),
      download: async () => null,
      downloadBinary: async () => null,
      deleteByPrefix: async () => {},
    } as unknown as IGcsRepository,
    {
      countActiveByUser: async () => 0,
      create: async () => {
        createCalls += 1;
        return createJob({ status: 'queued' });
      },
      markRunning: async () => true,
      get: async () => createJob({ status: 'queued' }),
      markSucceededIfRunning: async () => true,
      markFailedIfRunning: async () => true,
      getOwned: async () => null,
      markFailed: async () => createJob({ status: 'failed' }),
      markFailedIfRunningStale: async () => false,
      listRunningStale: async () => [],
      listQueuedStale: async () => [],
      markFailedIfQueuedStale: async () => false,
      linkAssetPackIfMissing: async () => true,
    } as unknown as PackGenerationJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => ({ status: 'active' }) as never,
      ...billingCreditMethods(),
      findPlanCreditAllowance: async (planKey: PlanKey) => ({
        planKey,
        monthlyCredits: 100,
        concurrentPackGenerationLimit: 3,
      }),
    } as unknown as BillingRepository,
    {
      isEnabled: () => true,
      enqueue: async () => {},
    } as unknown as AssetPackTaskQueue,
  );

  await usecase.execute({
    type: 'enqueue',
    input: {
      workspaceId: 'proj-1',
      userPrompt: 'make bracket',
      userId: 'user-1',
    },
  });

  assert.equal(createCalls, 1);
});

test('enqueue uses the free plan when no paid subscription exists', async () => {
  const planLookups: Array<PlanKey> = [];
  let createCalls = 0;

  const usecase = new PackGenerationJobsUsecase(
    {
      assetPack: async () => ({ title: 'n/a', message: 'n/a', code: 'n/a' }),
    } as unknown as AiAssetPackRepository,
    {
      create: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      updatePreview: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
    } as unknown as IAssetPackRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as WorkspaceRepository,
    {
      upload: async () => ({
        bucket: 'b',
        filename: 'f.ts',
        gcsUri: 'gs://bucket/file.ts',
        content: '',
      }),
      uploadBinary: async () => ({ bucket: 'b', objectPath: 'o', gcsUri: 'gs://bucket/file.glb' }),
      download: async () => null,
      downloadBinary: async () => null,
      deleteByPrefix: async () => {},
    } as unknown as IGcsRepository,
    {
      countActiveByUser: async () => 0,
      markRunning: async () => true,
      get: async () => createJob({ status: 'running' }),
      markSucceededIfRunning: async () => true,
      markFailedIfRunning: async () => true,
      create: async () => {
        createCalls += 1;
        return createJob({ status: 'queued' });
      },
      getOwned: async () => null,
      markFailed: async () => createJob({ status: 'failed' }),
      markFailedIfRunningStale: async () => false,
      listRunningStale: async () => [],
      listQueuedStale: async () => [],
      markFailedIfQueuedStale: async () => false,
      linkAssetPackIfMissing: async () => true,
    } as unknown as PackGenerationJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => null,
      ...billingCreditMethods(5, 5),
      findPlanCreditAllowance: async (planKey: PlanKey) => {
        planLookups.push(planKey);
        return {
          planKey,
          monthlyCredits: 5,
          concurrentPackGenerationLimit: 1,
        };
      },
    } as unknown as BillingRepository,
    undefined,
  );

  await usecase.execute({
    type: 'enqueue',
    input: {
      workspaceId: 'proj-1',
      userPrompt: 'make bracket',
      userId: 'user-1',
    },
  });

  assert.deepEqual(planLookups, ['free']);
  assert.equal(createCalls, 1);
});

test('get returns server-generated user-facing error message', async () => {
  const technicalFailure = createJob({
    status: 'failed',
    errorCode: null,
    errorStage: 'PROMPT_COMPILE',
    errorMessage: "Cannot read properties of undefined (reading 'prisma')",
  });
  const codeMappedFailure = createJob({
    id: 'gen-2',
    status: 'failed',
    errorCode: 'AI_AGENT_ASSET_PACK_FAILED',
    errorStage: 'AI_AGENT_INVOKE',
    errorMessage: 'ExecutionError: The result variable was not found.',
  });

  const usecase = new PackGenerationJobsUsecase(
    {} as unknown as AiAssetPackRepository,
    {} as unknown as IAssetPackRepository,
    {} as unknown as WorkspaceRepository,
    {} as unknown as IGcsRepository,
    {
      getOwned: async (_userId: string, assetPackId: string) => {
        if (assetPackId === 'gen-1') return technicalFailure;
        if (assetPackId === 'gen-2') return codeMappedFailure;
        return null;
      },
    } as unknown as PackGenerationJobRepositoryPostgres,
    {} as unknown as BillingRepository,
    undefined,
  );

  const technical = await usecase.query({ type: 'get', userId: 'user-1', packGenerationJobId: 'gen-1' });
  assert.equal(technical.errorMessage, 'Something went wrong. Please try again.');

  const mapped = await usecase.query({ type: 'get', userId: 'user-1', packGenerationJobId: 'gen-2' });
  assert.equal(mapped.errorMessage, 'Something went wrong. Please try again.');
});

test('inferErrorCode maps core failure patterns', () => {
  const usecase = new PackGenerationJobsUsecase(
    {} as unknown as AiAssetPackRepository,
    {} as unknown as IAssetPackRepository,
    {} as unknown as WorkspaceRepository,
    {} as unknown as IGcsRepository,
    {} as unknown as PackGenerationJobRepositoryPostgres,
    {} as unknown as BillingRepository,
    undefined,
  );

  assert.equal(
    inferErrorCodeForTest(usecase, 'AI agent HTTP 500: boom', 'UNKNOWN'),
    'AI_AGENT_HTTP_ERROR',
  );
  assert.equal(
    inferErrorCodeForTest(usecase, 'Prompt compile request failed: operation aborted', 'UNKNOWN'),
    'PROMPT_COMPILE_TIMEOUT',
  );
  assert.equal(
    inferErrorCodeForTest(usecase, 'runtime request failed: aborted', 'UNKNOWN'),
    'UNKNOWN',
  );
  assert.equal(
    inferErrorCodeForTest(usecase, 'No executable assets were returned.', 'UNKNOWN'),
    'ASSET_NOT_FOUND',
  );
  assert.equal(
    inferErrorCodeForTest(usecase, 'Invalid data URI', 'UNKNOWN'),
    'ASSET_UPLOAD_FAILED',
  );
  assert.equal(inferErrorCodeForTest(usecase, 'totally unknown', 'UNKNOWN'), 'UNKNOWN');
});
