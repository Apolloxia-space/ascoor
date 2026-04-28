import assert from 'node:assert/strict';
import test from 'node:test';

import { AssetPacksUsecase } from './assetPacks.usecase';
import type { IAssetPackRepository, IGcsRepository } from '../repositories/interfaces';
import type { WorkspaceRepository } from '../repositories/postgres/workspace.repository';
import type { PackGenerationJobRepositoryPostgres } from '../repositories/postgres/assetPack-job.repository';

test('get returns asset pack detail and latest linked pack generation prompt', async () => {
  const now = new Date('2026-02-15T00:00:00.000Z');
  const usecase = new AssetPacksUsecase(
    {
      getOwned: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'Bracket',
        type: 'studio_ts',
        assetUriTs: 'gs://bucket/file-1.ts',
        editedAssetUriGlb: 'gs://bucket/file-1-edited.glb',
        previewStatus: 'succeeded',
        previewError: null,
        editedAssetUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
      get: async () => null,
      list: async () => [],
      update: async () => {
        throw new Error('not used');
      },
      updateDisplayName: async () => {
        throw new Error('not used');
      },
      create: async () => {
        throw new Error('not used');
      },
      updatePreview: async () => {
        throw new Error('not used');
      },
      updateEditedAsset: async () => {
        throw new Error('not used');
      },
      delete: async () => {
        throw new Error('not used');
      },
    } as unknown as IAssetPackRepository,
    {} as WorkspaceRepository,
    {} as IGcsRepository,
    {
      findLatestByAssetPackOwned: async () => ({
        id: 'gen-1',
        workspaceId: 'proj-1',
        userId: 'user-1',
        userPrompt: 'create a bracket with holes',
        compiledPrompt: 'Goal\n- Create a bracket with holes',
        status: 'succeeded',
        message: 'done',
        title: 'Bracket',
        fileId: 'file-1',
        errorMessage: null,
        errorStage: null,
        errorCode: null,
        startedAt: null,
        createdAt: now,
        updatedAt: now,
      }),
    } as unknown as PackGenerationJobRepositoryPostgres,
  );

  const result = await usecase.get('user-1', 'file-1');

  assert.equal(result.assetPack.id, 'file-1');
  assert.equal(result.assetPack.previewStatus, 'succeeded');
  assert.equal(result.assetPack.editedAssetUriGlb, 'gs://bucket/file-1-edited.glb');
  assert.equal(result.latestPackGenerationJob?.packGenerationJobId, 'gen-1');
  assert.equal(result.latestPackGenerationJob?.userPrompt, 'create a bracket with holes');
});

test('get returns latestPackGenerationJob as null when no linked assetPack exists', async () => {
  const now = new Date('2026-02-15T00:00:00.000Z');
  const usecase = new AssetPacksUsecase(
    {
      getOwned: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'Bracket',
        type: 'studio_ts',
        assetUriTs: null,
        editedAssetUriGlb: null,
        previewStatus: 'unverified',
        previewError: null,
        editedAssetUpdatedAt: null,
        createdAt: now,
        updatedAt: now,
      }),
      get: async () => null,
      list: async () => [],
      update: async () => {
        throw new Error('not used');
      },
      updateDisplayName: async () => {
        throw new Error('not used');
      },
      create: async () => {
        throw new Error('not used');
      },
      updatePreview: async () => {
        throw new Error('not used');
      },
      updateEditedAsset: async () => {
        throw new Error('not used');
      },
      delete: async () => {
        throw new Error('not used');
      },
    } as unknown as IAssetPackRepository,
    {} as WorkspaceRepository,
    {} as IGcsRepository,
    {
      findLatestByAssetPackOwned: async () => null,
    } as unknown as PackGenerationJobRepositoryPostgres,
  );

  const result = await usecase.get('user-1', 'file-1');

  assert.equal(result.assetPack.id, 'file-1');
  assert.equal(result.latestPackGenerationJob, null);
});

test('getAssetContent returns JavaScript bytes even when asset status is failed', async () => {
  const now = new Date('2026-02-15T00:00:00.000Z');
  const expected = new Uint8Array([35, 32, 112, 121]);
  const usecase = new AssetPacksUsecase(
    {
      getOwned: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'Bracket',
        type: 'studio_ts',
        assetUriTs: 'gs://bucket/file-1.ts',
        editedAssetUriGlb: null,
        previewStatus: 'failed',
        previewError: 'Code execution failed.',
        editedAssetUpdatedAt: null,
        createdAt: now,
        updatedAt: now,
      }),
      get: async () => null,
      list: async () => [],
      update: async () => {
        throw new Error('not used');
      },
      updateDisplayName: async () => {
        throw new Error('not used');
      },
      create: async () => {
        throw new Error('not used');
      },
      updatePreview: async () => {
        throw new Error('not used');
      },
      updateEditedAsset: async () => {
        throw new Error('not used');
      },
      delete: async () => {
        throw new Error('not used');
      },
    } as unknown as IAssetPackRepository,
    {} as WorkspaceRepository,
    {
      upload: async () => {
        throw new Error('not used');
      },
      uploadBinary: async () => {
        throw new Error('not used');
      },
      download: async () => {
        throw new Error('not used');
      },
      downloadBinary: async () => expected,
      deleteByPrefix: async () => undefined,
    } as unknown as IGcsRepository,
    {} as PackGenerationJobRepositoryPostgres,
  );

  const result = await usecase.getAssetContent('user-1', 'file-1', 'ts');

  assert.equal(result.mime, 'text/javascript');
  assert.deepEqual(result.data, expected);
});

test('saveEditedModel uploads edited glb and persists metadata', async () => {
  const now = new Date('2026-02-15T00:00:00.000Z');
  const uploadedContent = new Uint8Array([1, 2, 3]);
  let uploadedObjectPath: string | null = null;
  let updatedEditedAssetUri: string | null = null;
  const usecase = new AssetPacksUsecase(
    {
      getOwned: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'Bracket',
        type: 'studio_ts',
        assetUriTs: 'gs://bucket/file-1.ts',
        editedAssetUriGlb: null,
        previewStatus: 'succeeded',
        previewError: null,
        editedAssetUpdatedAt: null,
        createdAt: now,
        updatedAt: now,
      }),
      get: async () => null,
      list: async () => [],
      update: async () => {
        throw new Error('not used');
      },
      updateDisplayName: async () => {
        throw new Error('not used');
      },
      create: async () => {
        throw new Error('not used');
      },
      updatePreview: async () => {
        throw new Error('not used');
      },
      updateEditedAsset: async (params: {
        fileId: string;
        editedAssetUriGlb: string | null;
        editedAssetUpdatedAt: Date | null;
      }) => {
        updatedEditedAssetUri = params.editedAssetUriGlb;
        return {
          id: 'file-1',
          workspaceId: 'proj-1',
          displayName: 'Bracket',
          type: 'studio_ts',
          assetUriTs: 'gs://bucket/file-1.ts',
          editedAssetUriGlb: params.editedAssetUriGlb,
          previewStatus: 'succeeded',
          previewError: null,
          editedAssetUpdatedAt: params.editedAssetUpdatedAt,
          createdAt: now,
          updatedAt: now,
        } as never;
      },
      delete: async () => {
        throw new Error('not used');
      },
    } as unknown as IAssetPackRepository,
    {} as WorkspaceRepository,
    {
      upload: async () => {
        throw new Error('not used');
      },
      uploadBinary: async (params: {
        content: Uint8Array;
        contentType: string;
        metadata?: Record<string, string>;
        objectPath: string;
      }) => {
        uploadedObjectPath = params.objectPath;
        assert.deepEqual(params.content, uploadedContent);
        return {
          bucket: 'bucket',
          objectPath: params.objectPath,
          gcsUri: 'gs://bucket/users/user-1/assetPacks/file-1/edited-model.glb',
        };
      },
      download: async () => {
        throw new Error('not used');
      },
      downloadBinary: async () => {
        throw new Error('not used');
      },
      deleteByPrefix: async () => undefined,
    } as unknown as IGcsRepository,
    {} as PackGenerationJobRepositoryPostgres,
  );

  await usecase.saveEditedModel('user-1', 'file-1', uploadedContent);

  assert.equal(uploadedObjectPath, 'users/user-1/assetPacks/file-1/edited-model.glb');
  assert.equal(updatedEditedAssetUri, 'gs://bucket/users/user-1/assetPacks/file-1/edited-model.glb');
});

test('clearEditedModel removes edited glb metadata', async () => {
  const now = new Date('2026-02-15T00:00:00.000Z');
  let deletedPrefix: string | null = null;
  let clearedEditedAssetUri: string | null | undefined;
  const usecase = new AssetPacksUsecase(
    {
      getOwned: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'Bracket',
        type: 'studio_ts',
        assetUriTs: 'gs://bucket/file-1.ts',
        editedAssetUriGlb: 'gs://bucket/users/user-1/assetPacks/file-1/edited-model.glb',
        previewStatus: 'succeeded',
        previewError: null,
        editedAssetUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
      get: async () => null,
      list: async () => [],
      update: async () => {
        throw new Error('not used');
      },
      updateDisplayName: async () => {
        throw new Error('not used');
      },
      create: async () => {
        throw new Error('not used');
      },
      updatePreview: async () => {
        throw new Error('not used');
      },
      updateEditedAsset: async (params: {
        fileId: string;
        editedAssetUriGlb: string | null;
        editedAssetUpdatedAt: Date | null;
      }) => {
        clearedEditedAssetUri = params.editedAssetUriGlb;
        return {
          id: 'file-1',
          workspaceId: 'proj-1',
          displayName: 'Bracket',
          type: 'studio_ts',
          assetUriTs: 'gs://bucket/file-1.ts',
          editedAssetUriGlb: params.editedAssetUriGlb,
          previewStatus: 'succeeded',
          previewError: null,
          editedAssetUpdatedAt: params.editedAssetUpdatedAt,
          createdAt: now,
          updatedAt: now,
        } as never;
      },
      delete: async () => {
        throw new Error('not used');
      },
    } as unknown as IAssetPackRepository,
    {} as WorkspaceRepository,
    {
      upload: async () => {
        throw new Error('not used');
      },
      uploadBinary: async () => {
        throw new Error('not used');
      },
      download: async () => {
        throw new Error('not used');
      },
      downloadBinary: async () => {
        throw new Error('not used');
      },
      deleteByPrefix: async ({ prefix }: { prefix: string }) => {
        deletedPrefix = prefix;
      },
    } as unknown as IGcsRepository,
    {} as PackGenerationJobRepositoryPostgres,
  );

  await usecase.clearEditedModel('user-1', 'file-1');

  assert.equal(deletedPrefix, 'users/user-1/assetPacks/file-1/edited-model.glb');
  assert.equal(clearedEditedAssetUri, null);
});

test('reportPreviewResult marks the asset pack preview as failed without mutating pack generation job status', async () => {
  const now = new Date('2026-02-15T00:00:00.000Z');
  const updatePreviewCalls: Array<{
    assetPackId: string;
    previewStatus: string;
    previewError?: string | null;
  }> = [];

  const usecase = new AssetPacksUsecase(
    {
      getOwned: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'Bracket',
        type: 'studio_ts',
        assetUriTs: 'gs://bucket/file-1.ts',
        editedAssetUriGlb: null,
        previewStatus: 'succeeded',
        previewError: null,
        editedAssetUpdatedAt: null,
        createdAt: now,
        updatedAt: now,
      }),
      get: async () => null,
      list: async () => [],
      update: async () => {
        throw new Error('not used');
      },
      updateDisplayName: async () => {
        throw new Error('not used');
      },
      create: async () => {
        throw new Error('not used');
      },
      updatePreview: async (params: {
        assetPackId: string;
        previewStatus: 'failed';
        previewError?: string | null;
      }) => {
        updatePreviewCalls.push({
          assetPackId: params.assetPackId,
          previewStatus: params.previewStatus,
          previewError: params.previewError ?? null,
        });
        return {
          id: 'file-1',
          workspaceId: 'proj-1',
          displayName: 'Bracket',
          type: 'studio_ts',
          assetUriTs: 'gs://bucket/file-1.ts',
          editedAssetUriGlb: null,
          previewStatus: 'failed',
          previewError: params.previewError ?? null,
          editedAssetUpdatedAt: null,
          createdAt: now,
          updatedAt: now,
        } as never;
      },
      updateEditedAsset: async () => {
        throw new Error('not used');
      },
      delete: async () => {
        throw new Error('not used');
      },
    } as unknown as IAssetPackRepository,
    {} as WorkspaceRepository,
    {} as IGcsRepository,
    {
      findLatestByAssetPackOwned: async () => ({
        id: 'gen-1',
        workspaceId: 'proj-1',
        userId: 'user-1',
        userPrompt: 'create a bracket with holes',
        compiledPrompt: 'Goal\n- Create a bracket with holes',
        status: 'succeeded',
        message: 'Generated bracket.',
        title: 'Bracket',
        assetPackId: 'file-1',
        errorMessage: null,
        errorStage: null,
        errorCode: null,
        startedAt: null,
        finishedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
    } as unknown as PackGenerationJobRepositoryPostgres,
  );

  await usecase.reportPreviewResult('user-1', 'file-1', {
    status: 'failed',
    errorMessage: ' Model failed to render. ',
  });

  assert.deepEqual(updatePreviewCalls, [
    {
      assetPackId: 'file-1',
      previewStatus: 'failed',
      previewError: 'Model failed to render.',
    },
  ]);
});

test('reportPreviewResult is a no-op when the latest linked job is not succeeded', async () => {
  const now = new Date('2026-02-15T00:00:00.000Z');
  let updatePreviewCalled = false;

  const usecase = new AssetPacksUsecase(
    {
      getOwned: async () => ({
        id: 'file-1',
        workspaceId: 'proj-1',
        displayName: 'Bracket',
        type: 'studio_ts',
        assetUriTs: 'gs://bucket/file-1.ts',
        editedAssetUriGlb: null,
        previewStatus: 'failed',
        previewError: 'Existing failure.',
        editedAssetUpdatedAt: null,
        createdAt: now,
        updatedAt: now,
      }),
      get: async () => null,
      list: async () => [],
      update: async () => {
        throw new Error('not used');
      },
      updateDisplayName: async () => {
        throw new Error('not used');
      },
      create: async () => {
        throw new Error('not used');
      },
      updatePreview: async () => {
        updatePreviewCalled = true;
        throw new Error('not used');
      },
      updateEditedAsset: async () => {
        throw new Error('not used');
      },
      delete: async () => {
        throw new Error('not used');
      },
    } as unknown as IAssetPackRepository,
    {} as WorkspaceRepository,
    {} as IGcsRepository,
    {
      findLatestByAssetPackOwned: async () => ({
        id: 'gen-1',
        workspaceId: 'proj-1',
        userId: 'user-1',
        userPrompt: 'create a bracket with holes',
        compiledPrompt: 'Goal\n- Create a bracket with holes',
        status: 'failed',
        message: 'Pack generation failed.',
        title: 'Bracket',
        assetPackId: 'file-1',
        errorMessage: 'Existing failure.',
        errorStage: 'WEB_THREE_RENDER',
        errorCode: 'STUDIO_RENDER_FAILED',
        startedAt: null,
        finishedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
    } as unknown as PackGenerationJobRepositoryPostgres,
  );

  await usecase.reportPreviewResult('user-1', 'file-1', {
    status: 'failed',
    errorMessage: 'Model failed to render.',
  });

  assert.equal(updatePreviewCalled, false);
});
