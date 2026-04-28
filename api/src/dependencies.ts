import { GcsRepository } from './repositories/gcs/gcs.repository';
import { LocalStorageRepository } from './repositories/gcs/local-storage.repository';
import { loadStorageConfig } from './config/storage';
import { loadAiAgentConfig } from './config/ai-agent';
import { loadAssetPackTaskConfig } from './config/assetPack-task';
import { AiAgentAssetPackRepository } from './repositories/ai/assetPack.repository.ai-agent';
import { AiAgentPackPlanRepository } from './repositories/ai/asset-pack-plan.repository.ai-agent';
import { AiAgentPromptCompilerRepository } from './repositories/ai/prompt-compiler.repository.ai-agent';
import { AssetPackRepositoryPostgres } from './repositories/postgres/assetPack.repository';
import { WorkspaceRepositoryPostgres } from './repositories/postgres/workspace.repository';
import { AssetPacksUsecase } from './usecases/assetPacks.usecase';
import { PackGenerationJobsUsecase } from './usecases/pack-generation-jobs.usecase';
import { WorkspacesUsecase } from './usecases/workspaces.usecase';
import { UserRepositoryPostgres } from './repositories/postgres/user.repository';
import { UsersUsecase } from './usecases/users.usecase';
import { BillingRepositoryPostgres } from './repositories/postgres/billing.repository';
import {
  StripeRepositoryStripe,
  StripeRepositoryStub,
} from './repositories/stripe/stripe.repository';
import { BillingUsecase } from './usecases/billing.usecase';
import { loadStripeConfig } from './config/stripe';
import { loadWebAppConfig } from './config/web-app';
import Stripe from 'stripe';
import { AssetPackTaskQueue } from './infra/assetPack-task-queue';
import { PackGenerationJobRepositoryPostgres } from './repositories/postgres/assetPack-job.repository';
import { getPrismaClient } from './db/client';
import { AssetPackPipelineService } from './services/assetPacks/assetPack-pipeline.service';

export function buildDependencies() {
  const prisma = getPrismaClient();
  const assetPackRepository = new AssetPackRepositoryPostgres(prisma);
  const workspaceRepository = new WorkspaceRepositoryPostgres(prisma);
  const packGenerationJobRepository = new PackGenerationJobRepositoryPostgres(prisma);
  const userRepository = new UserRepositoryPostgres(prisma);
  const billingRepository = new BillingRepositoryPostgres(prisma);
  const stripeConfig = loadStripeConfig();
  const webAppConfig = loadWebAppConfig();
  const stripeRepository = stripeConfig.secretKey
    ? new StripeRepositoryStripe(
        new Stripe(stripeConfig.secretKey, {
          typescript: true,
        }),
        stripeConfig.webhookSecret,
      )
    : new StripeRepositoryStub();
  const billingUsecase = new BillingUsecase(
    billingRepository,
    stripeRepository,
    webAppConfig.baseUrl,
  );
  const storageConfig = loadStorageConfig();
  const aiAgentConfig = loadAiAgentConfig();
  const gcsRepository =
    storageConfig.backend === 'local'
      ? new LocalStorageRepository({
          bucket: storageConfig.bucket,
          rootDir: storageConfig.localRoot,
        })
      : new GcsRepository({
          bucket: storageConfig.bucket,
        });
  const aiRepository = new AiAgentAssetPackRepository(aiAgentConfig);
  const packPlanRepository = new AiAgentPackPlanRepository(aiAgentConfig);
  const promptCompilerRepository = new AiAgentPromptCompilerRepository(aiAgentConfig);
  const assetPackPipelineService = new AssetPackPipelineService({
    aiRepository,
    packPlanRepository,
    assetPackRepository,
    workspaceRepository,
    gcsRepository,
    packGenerationJobRepository,
    billingRepository,
    promptCompilerRepository,
  });
  const assetPackTaskConfig = loadAssetPackTaskConfig();
  const assetPackTaskQueue = assetPackTaskConfig.enabled
    ? new AssetPackTaskQueue(assetPackTaskConfig)
    : undefined;

  const usersUsecase = new UsersUsecase(
    userRepository,
    billingRepository,
    stripeRepository,
    gcsRepository,
  );

  return {
    assetPacksUsecase: new AssetPacksUsecase(
      assetPackRepository,
      workspaceRepository,
      gcsRepository,
      packGenerationJobRepository,
    ),
    packGenerationJobsUsecase: new PackGenerationJobsUsecase(
      aiRepository,
      assetPackRepository,
      workspaceRepository,
      gcsRepository,
      packGenerationJobRepository,
      billingRepository,
      assetPackTaskQueue,
      promptCompilerRepository,
      assetPackPipelineService,
    ),
    workspacesUsecase: new WorkspacesUsecase(
      workspaceRepository,
      assetPackRepository,
      gcsRepository,
      usersUsecase,
    ),
    usersUsecase,
    billingUsecase,
  };
}
