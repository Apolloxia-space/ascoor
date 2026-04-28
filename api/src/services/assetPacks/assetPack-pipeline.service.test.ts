import assert from 'node:assert/strict';
import test from 'node:test';
import type { AiAssetPackRepository } from '../../repositories/ai/assetPack.repository';
import type { AiPackPlanRepository } from '../../repositories/ai/asset-pack-plan.repository';
import type { IGcsRepository, IAssetPackRepository } from '../../repositories/interfaces';
import type { PackGenerationJobRepositoryPostgres } from '../../repositories/postgres/assetPack-job.repository';
import type { WorkspaceRepository } from '../../repositories/postgres/workspace.repository';
import { AssetPackPipelineError, AssetPackPipelineService } from './assetPack-pipeline.service';

type CreateAssetPackParams = Parameters<IAssetPackRepository['createAssetPack']>[0];
type UpdatePartParams = Parameters<IAssetPackRepository['updatePart']>[0];
type UpdatePreviewParams = Parameters<IAssetPackRepository['updatePreview']>[0];
type UploadParams = Parameters<IGcsRepository['upload']>[0];
type LinkAssetPackParams = Parameters<PackGenerationJobRepositoryPostgres['linkAssetPackIfMissing']>[0];

const plan = {
  title: 'Gas Station Pack',
  message: 'Generated a small reusable pack.',
  parts: [
    {
      slug: 'gas_pump',
      displayName: 'Gas Pump',
      description: 'A rusty gas pump.',
      prompt: 'Create a rusty gas pump.',
    },
    {
      slug: 'broken_car',
      displayName: 'Broken Car',
      description: 'A damaged car shell.',
      prompt: 'Create a broken car.',
    },
    {
      slug: 'oil_barrel',
      displayName: 'Oil Barrel',
      description: 'A worn oil barrel.',
      prompt: 'Create an oil barrel.',
    },
    {
      slug: 'tire_stack',
      displayName: 'Tire Stack',
      description: 'A stack of tires.',
      prompt: 'Create a tire stack.',
    },
  ],
};

test('AssetPackPipelineService saves an asset pack when one part fails and three parts complete', async () => {
  const createdParts: Array<{ slug: string; status?: string | null }> = [];
  const partUpdates: Array<{
    slug: string;
    status: string;
    assetUriTs?: string | null;
    errorMessage?: string | null;
  }> = [];
  const uploadedPaths: Array<string> = [];
  const linkedJobs: Array<{ packGenerationJobId: string; resultAssetPackId: string }> = [];

  const service = new AssetPackPipelineService({
    aiRepository: {
      assetPack: async (input) => {
        if (input.userPrompt.includes('broken car')) {
          throw new Error('AI agent request failed: This operation was aborted');
        }
        return {
          title: 'Skipped',
          message: '',
          code: `const result = new THREE.Group(); result.name = ${JSON.stringify(input.userPrompt)};`,
        };
      },
    } as AiAssetPackRepository,
    packPlanRepository: {
      plan: async () => plan,
    } as AiPackPlanRepository,
    assetPackRepository: {
      createAssetPack: async (params: CreateAssetPackParams) => {
        createdParts.push(
          ...params.parts.map((part) => ({ slug: part.slug, status: part.status })),
        );
        return { id: 'assetPack-1', workspaceId: 'workspace-1', displayName: params.displayName };
      },
      updatePart: async (params: UpdatePartParams) => {
        partUpdates.push(params);
      },
      updatePreview: async (params: UpdatePreviewParams) => ({
        id: params.assetPackId,
        workspaceId: 'workspace-1',
        displayName: 'Gas Station Pack',
        assetUriTs: params.assetUriTs,
      }),
    } as unknown as IAssetPackRepository,
    workspaceRepository: {
      getOwned: async () => ({ id: 'workspace-1', ownerId: 'user-1', name: 'Workspace' }),
    } as unknown as WorkspaceRepository,
    gcsRepository: {
      upload: async (params: UploadParams) => {
        const objectPath = params.objectPath ?? 'unknown';
        uploadedPaths.push(objectPath);
        return {
          bucket: 'bucket',
          filename: objectPath,
          gcsUri: `gs://bucket/${objectPath}`,
          content: params.content,
        };
      },
    } as unknown as IGcsRepository,
    packGenerationJobRepository: {
      linkAssetPackIfMissing: async (params: LinkAssetPackParams) => {
        linkedJobs.push(params);
        return true;
      },
    } as unknown as PackGenerationJobRepositoryPostgres,
  });

  const result = await service.run(
    {
      packGenerationJobId: 'job-1',
      workspaceId: 'workspace-1',
      userId: 'user-1',
      userPrompt: 'Create a low-poly gas station pack.',
    },
    { packGenerationJobId: 'job-1', traceId: 'trace-1', requestId: 'request-1' },
  );

  assert.equal(result.assetPackId, 'assetPack-1');
  assert.equal(result.title, 'Gas Station Pack');
  assert.deepEqual(
    createdParts.map((part) => part.status),
    ['pending', 'pending', 'pending', 'pending'],
  );
  assert.deepEqual(linkedJobs, [{ packGenerationJobId: 'job-1', resultAssetPackId: 'assetPack-1' }]);
  assert.equal(partUpdates.filter((part) => part.status === 'completed').length, 3);
  assert.equal(partUpdates.filter((part) => part.status === 'failed').length, 1);
  assert.match(
    partUpdates.find((part) => part.slug === 'broken_car' && part.status === 'failed')
      ?.errorMessage ?? '',
    /aborted/,
  );
  assert.equal(uploadedPaths.filter((path) => path.includes('/parts/')).length, 3);
  assert.ok(uploadedPaths.includes('users/user-1/assetPacks/assetPack-1.ts'));
});

test('AssetPackPipelineService fails an asset pack when fewer than three parts complete', async () => {
  const service = new AssetPackPipelineService({
    aiRepository: {
      assetPack: async () => {
        throw new Error('AI agent request failed: This operation was aborted');
      },
    } as unknown as AiAssetPackRepository,
    packPlanRepository: {
      plan: async () => plan,
    } as AiPackPlanRepository,
    assetPackRepository: {
      createAssetPack: async (params: CreateAssetPackParams) => ({
        id: 'assetPack-1',
        workspaceId: 'workspace-1',
        displayName: params.displayName,
      }),
      updatePart: async () => {},
      updatePreview: async () => ({ id: 'assetPack-1', workspaceId: 'workspace-1' }),
    } as unknown as IAssetPackRepository,
    workspaceRepository: {
      getOwned: async () => ({ id: 'workspace-1', ownerId: 'user-1', name: 'Workspace' }),
    } as unknown as WorkspaceRepository,
    gcsRepository: {
      upload: async () => {
        throw new Error('should not upload pack preview');
      },
    } as unknown as IGcsRepository,
    packGenerationJobRepository: {
      linkAssetPackIfMissing: async () => true,
    } as unknown as PackGenerationJobRepositoryPostgres,
  });

  await assert.rejects(
    () =>
      service.run(
        {
          packGenerationJobId: 'job-1',
          workspaceId: 'workspace-1',
          userId: 'user-1',
          userPrompt: 'Create a low-poly gas station pack.',
        },
        { packGenerationJobId: 'job-1' },
      ),
    (error) => {
      assert.ok(error instanceof AssetPackPipelineError);
      assert.equal(error.errorCode, 'PART_GENERATION_INSUFFICIENT_PARTS');
      assert.equal(error.assetPackId, 'assetPack-1');
      return true;
    },
  );
});
