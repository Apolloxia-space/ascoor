import type { Env } from 'hono';
import type { DesignsUsecase } from '../usecases/designs.usecase';
import type { DesignJobsUsecase } from '../usecases/design-jobs.usecase';
import type { ProjectsUsecase } from '../usecases/projects.usecase';
import type { UsersUsecase } from '../usecases/users.usecase';
import type { BillingUsecase } from '../usecases/billing.usecase';
import type { Md } from './md';

export interface AppVariables {
  usecases: {
    designs: DesignsUsecase;
    designJobs: DesignJobsUsecase;
    projects: ProjectsUsecase;
    users: UsersUsecase;
    billing: BillingUsecase;
  };
  md: Md;
  requestId: string;
  traceId: string | null;
  designId: string | null;
}

export interface AppEnv extends Env {
  Variables: AppVariables;
}
