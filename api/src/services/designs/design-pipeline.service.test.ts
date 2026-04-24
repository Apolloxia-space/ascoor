import assert from 'node:assert/strict';
import test from 'node:test';
import type { AiDesignRepository } from '../../repositories/ai/design.repository';
import type { AiPackPlanRepository } from '../../repositories/ai/asset-pack-plan.repository';
import type { IGcsRepository, IDesignRepository } from '../../repositories/interfaces';
import type { DesignJobRepositoryPostgres } from '../../repositories/postgres/design-job.repository';
import type { ProjectRepository } from '../../repositories/postgres/project.repository';
import { DesignPipelineError, DesignPipelineService } from './design-pipeline.service';

type CreateAssetPackParams = Parameters<IDesignRepository['createAssetPack']>[0];
type UpdatePartParams = Parameters<IDesignRepository['updatePart']>[0];
type UpdatePreviewParams = Parameters<IDesignRepository['updatePreview']>[0];
type UploadParams = Parameters<IGcsRepository['upload']>[0];
type LinkDesignParams = Parameters<DesignJobRepositoryPostgres['linkDesignIfMissing']>[0];

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

test('DesignPipelineService saves an asset pack when one part fails and three parts complete', async () => {
  const createdParts: Array<{ slug: string; status?: string | null }> = [];
  const partUpdates: Array<{
    slug: string;
    status: string;
    assetUriTs?: string | null;
    errorMessage?: string | null;
  }> = [];
  const uploadedPaths: Array<string> = [];
  const linkedJobs: Array<{ designId: string; resultDesignId: string }> = [];

  const service = new DesignPipelineService({
    aiRepository: {
      design: async (input) => {
        if (input.userPrompt.includes('broken car')) {
          throw new Error('AI agent request failed: This operation was aborted');
        }
        return {
          title: 'Skipped',
          message: '',
          code: `const result = new THREE.Group(); result.name = ${JSON.stringify(input.userPrompt)};`,
        };
      },
    } as AiDesignRepository,
    packPlanRepository: {
      plan: async () => plan,
    } as AiPackPlanRepository,
    designRepository: {
      createAssetPack: async (params: CreateAssetPackParams) => {
        createdParts.push(
          ...params.parts.map((part) => ({ slug: part.slug, status: part.status })),
        );
        return { id: 'design-1', projectId: 'project-1', displayName: params.displayName };
      },
      updatePart: async (params: UpdatePartParams) => {
        partUpdates.push(params);
      },
      updatePreview: async (params: UpdatePreviewParams) => ({
        id: params.designId,
        projectId: 'project-1',
        displayName: 'Gas Station Pack',
        assetUriTs: params.assetUriTs,
      }),
    } as unknown as IDesignRepository,
    projectRepository: {
      getOwned: async () => ({ id: 'project-1', ownerId: 'user-1', name: 'Project' }),
    } as unknown as ProjectRepository,
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
    designJobRepository: {
      linkDesignIfMissing: async (params: LinkDesignParams) => {
        linkedJobs.push(params);
        return true;
      },
    } as unknown as DesignJobRepositoryPostgres,
  });

  const result = await service.run(
    {
      designId: 'job-1',
      projectId: 'project-1',
      userId: 'user-1',
      userPrompt: 'Create a low-poly gas station pack.',
    },
    { designId: 'job-1', traceId: 'trace-1', requestId: 'request-1' },
  );

  assert.equal(result.designId, 'design-1');
  assert.equal(result.title, 'Gas Station Pack');
  assert.deepEqual(
    createdParts.map((part) => part.status),
    ['pending', 'pending', 'pending', 'pending'],
  );
  assert.deepEqual(linkedJobs, [{ designId: 'job-1', resultDesignId: 'design-1' }]);
  assert.equal(partUpdates.filter((part) => part.status === 'completed').length, 3);
  assert.equal(partUpdates.filter((part) => part.status === 'failed').length, 1);
  assert.match(
    partUpdates.find((part) => part.slug === 'broken_car' && part.status === 'failed')
      ?.errorMessage ?? '',
    /aborted/,
  );
  assert.equal(uploadedPaths.filter((path) => path.includes('/parts/')).length, 3);
  assert.ok(uploadedPaths.includes('users/user-1/designs/design-1.ts'));
});

test('DesignPipelineService fails an asset pack when fewer than three parts complete', async () => {
  const service = new DesignPipelineService({
    aiRepository: {
      design: async () => {
        throw new Error('AI agent request failed: This operation was aborted');
      },
    } as unknown as AiDesignRepository,
    packPlanRepository: {
      plan: async () => plan,
    } as AiPackPlanRepository,
    designRepository: {
      createAssetPack: async (params: CreateAssetPackParams) => ({
        id: 'design-1',
        projectId: 'project-1',
        displayName: params.displayName,
      }),
      updatePart: async () => {},
      updatePreview: async () => ({ id: 'design-1', projectId: 'project-1' }),
    } as unknown as IDesignRepository,
    projectRepository: {
      getOwned: async () => ({ id: 'project-1', ownerId: 'user-1', name: 'Project' }),
    } as unknown as ProjectRepository,
    gcsRepository: {
      upload: async () => {
        throw new Error('should not upload pack preview');
      },
    } as unknown as IGcsRepository,
    designJobRepository: {
      linkDesignIfMissing: async () => true,
    } as unknown as DesignJobRepositoryPostgres,
  });

  await assert.rejects(
    () =>
      service.run(
        {
          designId: 'job-1',
          projectId: 'project-1',
          userId: 'user-1',
          userPrompt: 'Create a low-poly gas station pack.',
        },
        { designId: 'job-1' },
      ),
    (error) => {
      assert.ok(error instanceof DesignPipelineError);
      assert.equal(error.errorCode, 'PART_GENERATION_INSUFFICIENT_PARTS');
      assert.equal(error.designId, 'design-1');
      return true;
    },
  );
});
