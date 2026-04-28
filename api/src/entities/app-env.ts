import type { Env } from 'hono';
import type { AssetPacksUsecase } from '../usecases/assetPacks.usecase';
import type { PackGenerationJobsUsecase } from '../usecases/pack-generation-jobs.usecase';
import type { WorkspacesUsecase } from '../usecases/workspaces.usecase';
import type { UsersUsecase } from '../usecases/users.usecase';
import type { BillingUsecase } from '../usecases/billing.usecase';
import type { Md } from './md';

export interface AppVariables {
  usecases: {
    assetPacks: AssetPacksUsecase;
    packGenerationJobs: PackGenerationJobsUsecase;
    workspaces: WorkspacesUsecase;
    users: UsersUsecase;
    billing: BillingUsecase;
  };
  md: Md;
  requestId: string;
  traceId: string | null;
  packGenerationJobId: string | null;
}

export interface AppEnv extends Env {
  Variables: AppVariables;
}
