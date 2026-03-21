import assert from 'node:assert/strict';
import test from 'node:test';

import { DesignJobsUsecase } from './design-jobs.usecase';
import type { AiDesignInput, AiDesignRepository } from '../repositories/ai/design.repository';
import type { IGcsRepository, IDesignRepository } from '../repositories/interfaces';
import type { BillingRepository } from '../repositories/postgres/billing.repository';
import type { DesignJobRepositoryPostgres } from '../repositories/postgres/design-job.repository';
import type { ProjectRepository } from '../repositories/postgres/project.repository';
import type { DesignTaskQueue } from '../infra/design-task-queue';
import { DesignQuotaExceededError, ProSubscriptionRequiredError } from './errors';

type TestJob = {
  id: string;
  projectId: string;
  userId: string;
  userPrompt: string;
  compiledPrompt: string | null;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  message: string | null;
  title: string | null;
  designId: string | null;
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
  designId?: string | null;
};

type MarkFailedIfRunningParams = {
  id: string;
  errorMessage: string;
  message?: string | null;
  title?: string | null;
  designId?: string | null;
  errorCode?: string | null;
};

type MarkFailedIfRunningStaleParams = {
  id: string;
  staleBefore: Date;
  errorMessage: string;
  message?: string | null;
  title?: string | null;
};

type PlanKey = 'pro';

function inferErrorCodeForTest(
  usecase: DesignJobsUsecase,
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
    projectId: 'proj-1',
    userId: 'user-1',
    userPrompt: 'create bracket',
    compiledPrompt: null,
    status: 'running',
    message: null,
    title: null,
    designId: null,
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

test('process succeeds and marks design as succeeded', async () => {
  const markSucceededCalls: Array<{
    id: string;
    message: string;
    title: string;
    designId?: string | null;
  }> = [];
  const markFailedCalls: Array<{ id: string; errorMessage: string }> = [];
  const uploadBinaryCalls: Array<{ objectPath: string; contentType: string }> = [];

  const job = createJob({ status: 'running' });
  const createdFile = {
    id: 'file-1',
    projectId: 'proj-1',
    displayName: 'Bracket',
    type: 'studio_ts',
  };

  const usecase = new DesignJobsUsecase(
    {
      design: async () => ({
        title: 'Bracket',
        message: 'Generated bracket.',
        code: 'const result = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshStandardMaterial({ color: 0x6ea8fe }));',
      }),
    } as unknown as AiDesignRepository,
    {
      create: async () => createdFile,
      update: async () => ({ ...createdFile }),
      updateAsset: async () => ({ ...createdFile }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => createdFile,
      delete: async () => createdFile,
    } as unknown as IDesignRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as ProjectRepository,
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
      linkDesignIfMissing: async () => true,
    } as unknown as DesignJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => null,
      findPlanDesignLimit: async () => ({ planKey: 'pro', monthlyDesignLimit: 30 }),
    } as unknown as BillingRepository,
    undefined,
  );

  await usecase.execute({ type: 'process', designJobId: 'gen-1' });

  assert.equal(markSucceededCalls.length, 1);
  assert.equal(markSucceededCalls[0]?.id, 'gen-1');
  assert.equal(markSucceededCalls[0]?.designId, 'file-1');
  assert.equal(markFailedCalls.length, 0);
  assert.equal(uploadBinaryCalls.length, 0);
});

test('process marks failed when AI returns no executable code', async () => {
  const markFailedCalls: Array<{ id: string; errorMessage: string; designId?: string | null }> = [];

  const usecase = new DesignJobsUsecase(
    {
      design: async () => ({
        title: 'Broken',
        message: 'No code output.',
        code: '',
      }),
    } as unknown as AiDesignRepository,
    {
      create: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'Broken',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'Broken',
        type: 'studio_ts',
      }),
      updateAsset: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'Broken',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'Broken',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'Broken',
        type: 'studio_ts',
      }),
    } as unknown as IDesignRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as ProjectRepository,
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
          designId: params.designId,
        });
        return true;
      },
      create: async () => createJob({ status: 'queued' }),
      getOwned: async () => null,
      markFailed: async () => createJob({ status: 'failed' }),
      markFailedIfRunningStale: async () => false,
      listRunningStale: async () => [],
      linkDesignIfMissing: async () => true,
    } as unknown as DesignJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => null,
      findPlanDesignLimit: async () => ({ planKey: 'pro', monthlyDesignLimit: 30 }),
    } as unknown as BillingRepository,
    undefined,
  );

  await usecase.execute({ type: 'process', designJobId: 'gen-1' });

  assert.equal(markFailedCalls.length, 1);
  assert.equal(markFailedCalls[0]?.id, 'gen-1');
  assert.equal(markFailedCalls[0]?.designId, 'file-1');
  assert.equal(markFailedCalls[0]?.errorMessage, 'Model design did not return executable code.');
});

test('process succeeds without runtime execution and links generated design', async () => {
  const markFailedCalls: Array<{
    id: string;
    errorMessage: string;
    designId?: string | null;
    errorCode?: string | null;
  }> = [];
  const markSucceededCalls: Array<{ id: string; designId: string | null }> = [];
  const aiInvokeCalls: Array<{
    prompt: string;
  }> = [];

  const usecase = new DesignJobsUsecase(
    {
      design: async (params: AiDesignInput) => {
        aiInvokeCalls.push({
          prompt: params.prompt,
        });
        return {
          title: 'Broken bracket',
          message: 'execution failed',
          code: 'const result = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshStandardMaterial({ color: 0x6ea8fe }));',
        };
      },
    } as unknown as AiDesignRepository,
    {
      create: async () => ({
        id: 'file-failed-1',
        projectId: 'proj-1',
        displayName: 'Broken bracket',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-failed-1',
        projectId: 'proj-1',
        displayName: 'Broken bracket',
        type: 'studio_ts',
      }),
      updateAsset: async () => ({
        id: 'file-failed-1',
        projectId: 'proj-1',
        displayName: 'Broken bracket',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-failed-1',
        projectId: 'proj-1',
        displayName: 'Broken bracket',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-failed-1',
        projectId: 'proj-1',
        displayName: 'Broken bracket',
        type: 'studio_ts',
      }),
    } as unknown as IDesignRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as ProjectRepository,
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
          designId: params.designId ?? null,
        });
        return true;
      },
      markFailedIfRunning: async (params: MarkFailedIfRunningParams) => {
        markFailedCalls.push({
          id: params.id,
          errorMessage: params.errorMessage,
          designId: params.designId,
          errorCode: params.errorCode,
        });
        return true;
      },
      create: async () => createJob({ status: 'queued' }),
      getOwned: async () => null,
      markFailed: async () => createJob({ status: 'failed' }),
      markFailedIfRunningStale: async () => false,
      listRunningStale: async () => [],
      linkDesignIfMissing: async () => true,
    } as unknown as DesignJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => null,
      findPlanDesignLimit: async () => ({ planKey: 'pro', monthlyDesignLimit: 30 }),
    } as unknown as BillingRepository,
    undefined,
  );

  await usecase.execute({ type: 'process', designJobId: 'gen-1' });

  assert.equal(markFailedCalls.length, 0);
  assert.equal(markSucceededCalls.length, 1);
  assert.equal(markSucceededCalls[0]?.id, 'gen-1');
  assert.equal(markSucceededCalls[0]?.designId, 'file-failed-1');
  assert.equal(aiInvokeCalls.length, 1);
  assert.equal(
    inferErrorCodeForTest(
      usecase,
      'ExecutionError: The result variable was not found. Assign the final shape to result.',
      'UNKNOWN',
    ),
    'AI_AGENT_DESIGN_FAILED',
  );
  assert.equal(inferErrorCodeForTest(usecase, 'project not found', 'UNKNOWN'), 'PROJECT_NOT_FOUND');
});

test('process does not recover stale design when claimed by another worker', async () => {
  const staleRecoverCalls: Array<{ id: string; errorMessage: string }> = [];
  let getCalls = 0;

  const staleJob = createJob({
    status: 'running',
    startedAt: new Date(Date.now() - 60_000),
  });
  const failedJob = createJob({
    status: 'failed',
    errorMessage: 'Design timed out while processing.',
    startedAt: staleJob.startedAt,
  });

  const usecase = new DesignJobsUsecase(
    {
      design: async () => ({
        title: 'n/a',
        message: 'n/a',
        code: 'n/a',
      }),
    } as unknown as AiDesignRepository,
    {
      create: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      updateAsset: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
    } as unknown as IDesignRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as ProjectRepository,
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
      linkDesignIfMissing: async () => true,
    } as unknown as DesignJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => null,
      findPlanDesignLimit: async () => ({ planKey: 'pro', monthlyDesignLimit: 30 }),
    } as unknown as BillingRepository,
    undefined,
  );

  await usecase.execute({ type: 'process', designJobId: 'gen-1' });

  assert.equal(staleRecoverCalls.length, 0);
  assert.equal(getCalls, 1);
});

test('enqueue marks failed when task queue enqueue throws', async () => {
  const enqueueCalls: Array<string> = [];
  const markFailedCalls: Array<{ id: string; errorMessage: string }> = [];

  const createdJob = createJob({ status: 'queued' });

  const usecase = new DesignJobsUsecase(
    {
      design: async () => ({
        title: 'n/a',
        message: 'n/a',
        code: 'n/a',
      }),
    } as unknown as AiDesignRepository,
    {
      create: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      updateAsset: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
    } as unknown as IDesignRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as ProjectRepository,
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
      countSucceededByUserInPeriod: async () => 0,
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
      linkDesignIfMissing: async () => true,
    } as unknown as DesignJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => ({ status: 'active' }) as never,
      findPlanDesignLimit: async (planKey: PlanKey) => ({
        planKey,
        monthlyDesignLimit: 30,
      }),
    } as unknown as BillingRepository,
    {
      isEnabled: () => true,
      enqueue: async (designId: string) => {
        enqueueCalls.push(designId);
        throw new Error('enqueue exploded');
      },
    } as unknown as DesignTaskQueue,
  );

  const response = await usecase.execute({
    type: 'enqueue',
    input: {
      projectId: 'proj-1',
      userPrompt: 'make bracket',
      userId: 'user-1',
    },
  });

  assert.equal(response.designJobId, 'gen-1');
  assert.equal(enqueueCalls.length, 1);
  assert.equal(enqueueCalls[0], 'gen-1');
  assert.equal(markFailedCalls.length, 1);
  assert.match(markFailedCalls[0]?.errorMessage ?? '', /Failed to enqueue design task/);
});

test('enqueue throws quota exceeded error when monthly generated design limit is reached', async () => {
  const usecase = new DesignJobsUsecase(
    {
      design: async () => ({ title: 'n/a', message: 'n/a', code: 'n/a' }),
    } as unknown as AiDesignRepository,
    {
      create: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      updateAsset: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
    } as unknown as IDesignRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as ProjectRepository,
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
      countSucceededByUserInPeriod: async () => 30,
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
      linkDesignIfMissing: async () => true,
    } as unknown as DesignJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => ({ status: 'active' }) as never,
      findPlanDesignLimit: async () => ({ planKey: 'pro', monthlyDesignLimit: 30 }),
    } as unknown as BillingRepository,
    undefined,
  );

  await assert.rejects(
    () =>
      usecase.execute({
        type: 'enqueue',
        input: {
          projectId: 'proj-1',
          userPrompt: 'make bracket',
          userId: 'user-1',
        },
      }),
    (error: unknown) => {
      assert(error instanceof DesignQuotaExceededError);
      assert.equal(error.code, 'design_limit_exceeded');
      return true;
    },
  );
});

test('enqueue resolves only the Pro plan limit', async () => {
  const planLookups: Array<PlanKey> = [];
  let countCalls = 0;
  let createCalls = 0;

  const usecase = new DesignJobsUsecase(
    {
      design: async () => ({ title: 'n/a', message: 'n/a', code: 'n/a' }),
    } as unknown as AiDesignRepository,
    {
      create: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      updateAsset: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
    } as unknown as IDesignRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as ProjectRepository,
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
      countSucceededByUserInPeriod: async () => {
        countCalls += 1;
        return 4;
      },
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
      linkDesignIfMissing: async () => true,
    } as unknown as DesignJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => ({ status: 'active' }) as never,
      findPlanDesignLimit: async (planKey: PlanKey) => {
        planLookups.push(planKey);
        return { planKey: 'pro', monthlyDesignLimit: 30 };
      },
    } as unknown as BillingRepository,
    {
      isEnabled: () => true,
      enqueue: async () => {},
    } as unknown as DesignTaskQueue,
  );

  await usecase.execute({
    type: 'enqueue',
    input: {
      projectId: 'proj-1',
      userPrompt: 'make bracket',
      userId: 'user-1',
    },
  });

  assert.deepEqual(planLookups, ['pro']);
  assert.equal(countCalls, 1);
  assert.equal(createCalls, 1);
});

test('reap stale also recovers queued designs', async () => {
  const queuedRecoverCalls: Array<{ id: string; errorMessage: string }> = [];
  const queuedJob = createJob({
    id: 'gen-queued-1',
    status: 'queued',
    startedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

  const usecase = new DesignJobsUsecase(
    {
      design: async () => ({ title: 'n/a', message: 'n/a', code: 'n/a' }),
    } as unknown as AiDesignRepository,
    {
      create: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      updateAsset: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
    } as unknown as IDesignRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as ProjectRepository,
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
      linkDesignIfMissing: async () => true,
    } as unknown as DesignJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => null,
      findPlanDesignLimit: async (planKey: PlanKey) => ({
        planKey,
        monthlyDesignLimit: 30,
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

test('enqueue creates a design when monthly generated design count is below limit', async () => {
  let countCalls = 0;
  let createCalls = 0;

  const usecase = new DesignJobsUsecase(
    {
      design: async () => ({
        title: 'n/a',
        message: 'n/a',
        code: 'const result = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshStandardMaterial({ color: 0x6ea8fe }));',
      }),
    } as unknown as AiDesignRepository,
    {
      create: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      updateAsset: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
    } as unknown as IDesignRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as ProjectRepository,
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
      countSucceededByUserInPeriod: async () => {
        countCalls += 1;
        return 0;
      },
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
      linkDesignIfMissing: async () => true,
    } as unknown as DesignJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => ({ status: 'active' }) as never,
      findPlanDesignLimit: async (planKey: PlanKey) => ({
        planKey,
        monthlyDesignLimit: 30,
      }),
    } as unknown as BillingRepository,
    {
      isEnabled: () => true,
      enqueue: async () => {},
    } as unknown as DesignTaskQueue,
  );

  await usecase.execute({
    type: 'enqueue',
    input: {
      projectId: 'proj-1',
      userPrompt: 'make bracket',
      userId: 'user-1',
    },
  });

  assert.equal(countCalls, 1);
  assert.equal(createCalls, 1);
});

test('enqueue requires an active Pro subscription', async () => {
  const usecase = new DesignJobsUsecase(
    {
      design: async () => ({ title: 'n/a', message: 'n/a', code: 'n/a' }),
    } as unknown as AiDesignRepository,
    {
      create: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      update: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      updateAsset: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      get: async () => null,
      getOwned: async () => null,
      list: async () => [],
      updateDisplayName: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
      delete: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'file',
        type: 'studio_ts',
      }),
    } as unknown as IDesignRepository,
    {
      getOwned: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      get: async () => null,
      listByOwner: async () => [],
      updateName: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      delete: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
      create: async () => ({ id: 'proj-1', ownerId: 'user-1', name: 'p' }),
    } as unknown as ProjectRepository,
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
      countSucceededByUserInPeriod: async () => 0,
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
      linkDesignIfMissing: async () => true,
    } as unknown as DesignJobRepositoryPostgres,
    {
      findSubscriptionByUserId: async () => null,
      findPlanDesignLimit: async () => ({ planKey: 'pro', monthlyDesignLimit: 30 }),
    } as unknown as BillingRepository,
    undefined,
  );

  await assert.rejects(
    () =>
      usecase.execute({
        type: 'enqueue',
        input: {
          projectId: 'proj-1',
          userPrompt: 'make bracket',
          userId: 'user-1',
        },
      }),
    (error: unknown) => {
      assert(error instanceof ProSubscriptionRequiredError);
      assert.equal(error.code, 'pro_subscription_required');
      return true;
    },
  );
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
    errorCode: 'AI_AGENT_DESIGN_FAILED',
    errorStage: 'AI_AGENT_INVOKE',
    errorMessage: 'ExecutionError: The result variable was not found.',
  });

  const usecase = new DesignJobsUsecase(
    {} as unknown as AiDesignRepository,
    {} as unknown as IDesignRepository,
    {} as unknown as ProjectRepository,
    {} as unknown as IGcsRepository,
    {
      getOwned: async (_userId: string, designId: string) => {
        if (designId === 'gen-1') return technicalFailure;
        if (designId === 'gen-2') return codeMappedFailure;
        return null;
      },
    } as unknown as DesignJobRepositoryPostgres,
    {} as unknown as BillingRepository,
    undefined,
  );

  const technical = await usecase.query({ type: 'get', userId: 'user-1', designJobId: 'gen-1' });
  assert.equal(technical.errorMessage, 'Something went wrong. Please try again.');

  const mapped = await usecase.query({ type: 'get', userId: 'user-1', designJobId: 'gen-2' });
  assert.equal(mapped.errorMessage, 'Something went wrong. Please try again.');
});

test('inferErrorCode maps core failure patterns', () => {
  const usecase = new DesignJobsUsecase(
    {} as unknown as AiDesignRepository,
    {} as unknown as IDesignRepository,
    {} as unknown as ProjectRepository,
    {} as unknown as IGcsRepository,
    {} as unknown as DesignJobRepositoryPostgres,
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
