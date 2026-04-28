import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { randomUUID } from 'node:crypto';
import type { AssetPacksUsecase } from './usecases/assetPacks.usecase';
import type { PackGenerationJobsUsecase } from './usecases/pack-generation-jobs.usecase';
import type { WorkspacesUsecase } from './usecases/workspaces.usecase';
import type { UsersUsecase } from './usecases/users.usecase';
import type { BillingUsecase } from './usecases/billing.usecase';
import type { AppEnv } from './entities/app-env';
import { authMiddleware } from './middleware/auth.middleware';
import { createAssetPacksRoutes } from './routes/api/assetPacks.routes';
import { createPackGenerationJobsRoutes } from './routes/api/pack-generation-jobs.routes';
import { createWorkspacesRoutes } from './routes/api/workspaces.routes';
import { createUsersRoutes } from './routes/api/users.routes';
import { createBillingRoutes } from './routes/api/billing.routes';
import { logger } from './utils/logger';

export interface AppDependencies {
  assetPacksUsecase: AssetPacksUsecase;
  packGenerationJobsUsecase: PackGenerationJobsUsecase;
  workspacesUsecase: WorkspacesUsecase;
  usersUsecase: UsersUsecase;
  billingUsecase: BillingUsecase;
}

export type AppType = ReturnType<typeof createApp>;

export function createApp(dependencies: AppDependencies) {
  const app = new Hono<AppEnv>();

  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: [
        'Content-Type',
        'Authorization',
        'X-Pack-Generation-Job-Id',
        'X-Trace-Id',
        'X-Origin-Request-Id',
      ],
      exposeHeaders: ['X-Request-Id', 'X-Trace-Id'],
    }),
  );

  app.use('*', async (c, next) => {
    const requestId = randomUUID();
    const packGenerationJobId = c.req.header('x-pack-generation-job-id')?.trim() || null;
    const incomingTraceId = c.req.header('x-trace-id')?.trim() || null;
    const traceId = incomingTraceId ?? packGenerationJobId ?? requestId;
    c.set('requestId', requestId);
    c.set('packGenerationJobId', packGenerationJobId);
    c.set('traceId', traceId);
    c.header('X-Request-Id', requestId);
    c.header('X-Trace-Id', traceId);
    await next();
  });

  app.use('*', async (c, next) => {
    c.set('usecases', {
      assetPacks: dependencies.assetPacksUsecase,
      packGenerationJobs: dependencies.packGenerationJobsUsecase,
      workspaces: dependencies.workspacesUsecase,
      users: dependencies.usersUsecase,
      billing: dependencies.billingUsecase,
    });
    await next();
  });

  app.use('*', authMiddleware);

  app.onError((err, c) => {
    const requestId = c.get('requestId');
    const traceId = c.get('traceId');
    logger.error('unhandled_error', {
      requestId,
      trace_id: traceId,
      path: c.req.path,
      method: c.req.method,
      error: err.message,
      stack: err.stack,
    });
    return c.json({ error: 'internal_server_error', requestId, traceId }, 500);
  });

  app.get('/', (c) => c.json({ message: 'ascoor API placeholder' }));
  app.get('/health', (c) => c.json({ status: 'ok' }));
  app.route('/asset-packs', createAssetPacksRoutes());
  app.route('/pack-generation-jobs', createPackGenerationJobsRoutes());
  app.route('/workspaces', createWorkspacesRoutes());
  app.route('/users', createUsersRoutes());
  app.route('/billing', createBillingRoutes());
  return app;
}
