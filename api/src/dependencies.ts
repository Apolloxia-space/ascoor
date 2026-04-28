import { GcsRepository } from './repositories/gcs/gcs.repository';
import { LocalStorageRepository } from './repositories/gcs/local-storage.repository';
import { loadStorageConfig } from './config/storage';
import { loadAiAgentConfig } from './config/ai-agent';
import { loadDesignTaskConfig } from './config/design-task';
import { AiAgentDesignRepository } from './repositories/ai/design.repository.ai-agent';
import { AiAgentPackPlanRepository } from './repositories/ai/asset-pack-plan.repository.ai-agent';
import { AiAgentPromptCompilerRepository } from './repositories/ai/prompt-compiler.repository.ai-agent';
import { DesignRepositoryPostgres } from './repositories/postgres/design.repository';
import { ProjectRepositoryPostgres } from './repositories/postgres/project.repository';
import { DesignsUsecase } from './usecases/designs.usecase';
import { DesignJobsUsecase } from './usecases/design-jobs.usecase';
import { ProjectsUsecase } from './usecases/projects.usecase';
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
import { DesignTaskQueue } from './infra/design-task-queue';
import { DesignJobRepositoryPostgres } from './repositories/postgres/design-job.repository';
import { getPrismaClient } from './db/client';
import { DesignPipelineService } from './services/designs/design-pipeline.service';

export function buildDependencies() {
  const prisma = getPrismaClient();
  const designRepository = new DesignRepositoryPostgres(prisma);
  const projectRepository = new ProjectRepositoryPostgres(prisma);
  const designJobRepository = new DesignJobRepositoryPostgres(prisma);
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
  const aiRepository = new AiAgentDesignRepository(aiAgentConfig);
  const packPlanRepository = new AiAgentPackPlanRepository(aiAgentConfig);
  const promptCompilerRepository = new AiAgentPromptCompilerRepository(aiAgentConfig);
  const designPipelineService = new DesignPipelineService({
    aiRepository,
    packPlanRepository,
    designRepository,
    projectRepository,
    gcsRepository,
    designJobRepository,
    billingRepository,
    promptCompilerRepository,
  });
  const designTaskConfig = loadDesignTaskConfig();
  const designTaskQueue = designTaskConfig.enabled
    ? new DesignTaskQueue(designTaskConfig)
    : undefined;

  const usersUsecase = new UsersUsecase(
    userRepository,
    billingRepository,
    stripeRepository,
    gcsRepository,
  );

  return {
    designsUsecase: new DesignsUsecase(
      designRepository,
      projectRepository,
      gcsRepository,
      designJobRepository,
    ),
    designJobsUsecase: new DesignJobsUsecase(
      aiRepository,
      designRepository,
      projectRepository,
      gcsRepository,
      designJobRepository,
      billingRepository,
      designTaskQueue,
      promptCompilerRepository,
      designPipelineService,
    ),
    projectsUsecase: new ProjectsUsecase(
      projectRepository,
      designRepository,
      gcsRepository,
      usersUsecase,
    ),
    usersUsecase,
    billingUsecase,
  };
}
