import assert from 'node:assert/strict';
import test from 'node:test';

import { DesignsUsecase } from './designs.usecase';
import type { IDesignRepository, IGcsRepository } from '../repositories/interfaces';
import type { ProjectRepository } from '../repositories/postgres/project.repository';
import type { DesignJobRepositoryPostgres } from '../repositories/postgres/design-job.repository';

test('get returns design detail and latest linked design prompt', async () => {
  const now = new Date('2026-02-15T00:00:00.000Z');
  const usecase = new DesignsUsecase(
    {
      getOwned: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'Bracket',
        type: 'studio_ts',
        assetUriTs: 'gs://bucket/file-1.ts',
        editedAssetUriGlb: 'gs://bucket/file-1-edited.glb',
        assetStatus: 'succeeded',
        assetError: null,
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
      updateAsset: async () => {
        throw new Error('not used');
      },
      updateEditedAsset: async () => {
        throw new Error('not used');
      },
      delete: async () => {
        throw new Error('not used');
      },
    } as unknown as IDesignRepository,
    {} as ProjectRepository,
    {} as IGcsRepository,
    {
      findLatestByDesignOwned: async () => ({
        id: 'gen-1',
        projectId: 'proj-1',
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
    } as unknown as DesignJobRepositoryPostgres,
  );

  const result = await usecase.get('user-1', 'file-1');

  assert.equal(result.design.id, 'file-1');
  assert.equal(result.design.assetStatus, 'succeeded');
  assert.equal(result.design.editedAssetUriGlb, 'gs://bucket/file-1-edited.glb');
  assert.equal(result.latestDesignJob?.designJobId, 'gen-1');
  assert.equal(result.latestDesignJob?.userPrompt, 'create a bracket with holes');
});

test('get returns latestDesignJob as null when no linked design exists', async () => {
  const now = new Date('2026-02-15T00:00:00.000Z');
  const usecase = new DesignsUsecase(
    {
      getOwned: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'Bracket',
        type: 'studio_ts',
        assetUriTs: null,
        editedAssetUriGlb: null,
        assetStatus: 'queued',
        assetError: null,
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
      updateAsset: async () => {
        throw new Error('not used');
      },
      updateEditedAsset: async () => {
        throw new Error('not used');
      },
      delete: async () => {
        throw new Error('not used');
      },
    } as unknown as IDesignRepository,
    {} as ProjectRepository,
    {} as IGcsRepository,
    {
      findLatestByDesignOwned: async () => null,
    } as unknown as DesignJobRepositoryPostgres,
  );

  const result = await usecase.get('user-1', 'file-1');

  assert.equal(result.design.id, 'file-1');
  assert.equal(result.latestDesignJob, null);
});

test('getAssetContent returns JavaScript bytes even when asset status is failed', async () => {
  const now = new Date('2026-02-15T00:00:00.000Z');
  const expected = new Uint8Array([35, 32, 112, 121]);
  const usecase = new DesignsUsecase(
    {
      getOwned: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'Bracket',
        type: 'studio_ts',
        assetUriTs: 'gs://bucket/file-1.ts',
        editedAssetUriGlb: null,
        assetStatus: 'failed',
        assetError: 'Code execution failed.',
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
      updateAsset: async () => {
        throw new Error('not used');
      },
      updateEditedAsset: async () => {
        throw new Error('not used');
      },
      delete: async () => {
        throw new Error('not used');
      },
    } as unknown as IDesignRepository,
    {} as ProjectRepository,
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
    {} as DesignJobRepositoryPostgres,
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
  const usecase = new DesignsUsecase(
    {
      getOwned: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'Bracket',
        type: 'studio_ts',
        assetUriTs: 'gs://bucket/file-1.ts',
        editedAssetUriGlb: null,
        assetStatus: 'succeeded',
        assetError: null,
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
      updateAsset: async () => {
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
          projectId: 'proj-1',
          displayName: 'Bracket',
          type: 'studio_ts',
          assetUriTs: 'gs://bucket/file-1.ts',
          editedAssetUriGlb: params.editedAssetUriGlb,
          assetStatus: 'succeeded',
          assetError: null,
          editedAssetUpdatedAt: params.editedAssetUpdatedAt,
          createdAt: now,
          updatedAt: now,
        } as never;
      },
      delete: async () => {
        throw new Error('not used');
      },
    } as unknown as IDesignRepository,
    {} as ProjectRepository,
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
          gcsUri: 'gs://bucket/users/user-1/designs/file-1/edited-model.glb',
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
    {} as DesignJobRepositoryPostgres,
  );

  await usecase.saveEditedModel('user-1', 'file-1', uploadedContent);

  assert.equal(uploadedObjectPath, 'users/user-1/designs/file-1/edited-model.glb');
  assert.equal(updatedEditedAssetUri, 'gs://bucket/users/user-1/designs/file-1/edited-model.glb');
});

test('clearEditedModel removes edited glb metadata', async () => {
  const now = new Date('2026-02-15T00:00:00.000Z');
  let deletedPrefix: string | null = null;
  let clearedEditedAssetUri: string | null | undefined;
  const usecase = new DesignsUsecase(
    {
      getOwned: async () => ({
        id: 'file-1',
        projectId: 'proj-1',
        displayName: 'Bracket',
        type: 'studio_ts',
        assetUriTs: 'gs://bucket/file-1.ts',
        editedAssetUriGlb: 'gs://bucket/users/user-1/designs/file-1/edited-model.glb',
        assetStatus: 'succeeded',
        assetError: null,
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
      updateAsset: async () => {
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
          projectId: 'proj-1',
          displayName: 'Bracket',
          type: 'studio_ts',
          assetUriTs: 'gs://bucket/file-1.ts',
          editedAssetUriGlb: params.editedAssetUriGlb,
          assetStatus: 'succeeded',
          assetError: null,
          editedAssetUpdatedAt: params.editedAssetUpdatedAt,
          createdAt: now,
          updatedAt: now,
        } as never;
      },
      delete: async () => {
        throw new Error('not used');
      },
    } as unknown as IDesignRepository,
    {} as ProjectRepository,
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
    {} as DesignJobRepositoryPostgres,
  );

  await usecase.clearEditedModel('user-1', 'file-1');

  assert.equal(deletedPrefix, 'users/user-1/designs/file-1/edited-model.glb');
  assert.equal(clearedEditedAssetUri, null);
});
