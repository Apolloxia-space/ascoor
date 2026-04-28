import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import type { AppDependencies } from './app';
import type { AppEnv } from './entities/app-env';
import { createInternalRoutes } from './routes/worker/internal.routes';
import { logger } from './utils/logger';

export function createWorkerApp(dependencies: AppDependencies) {
  const app = new Hono<AppEnv>();

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

  app.onError((err, c) => {
    const requestId = c.get('requestId');
    const traceId = c.get('traceId');
    logger.error('worker_unhandled_error', {
      requestId,
      trace_id: traceId,
      path: c.req.path,
      method: c.req.method,
      error: err.message,
      stack: err.stack,
    });
    return c.json({ error: 'internal_server_error', requestId, traceId }, 500);
  });

  app.get('/health', (c) => c.json({ status: 'ok' }));
  app.route('/internal', createInternalRoutes());

  return app;
}
