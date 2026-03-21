import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { randomUUID } from 'node:crypto';
import type { DesignsUsecase } from './usecases/designs.usecase';
import type { DesignJobsUsecase } from './usecases/design-jobs.usecase';
import type { ProjectsUsecase } from './usecases/projects.usecase';
import type { UsersUsecase } from './usecases/users.usecase';
import type { BillingUsecase } from './usecases/billing.usecase';
import type { AppEnv } from './entities/app-env';
import { authMiddleware } from './middleware/auth.middleware';
import { createDesignsRoutes } from './routes/api/designs.routes';
import { createDesignJobsRoutes } from './routes/api/design-jobs.routes';
import { createProjectsRoutes } from './routes/api/projects.routes';
import { createUsersRoutes } from './routes/api/users.routes';
import { createBillingRoutes } from './routes/api/billing.routes';
import { logger } from './utils/logger';

export interface AppDependencies {
  designsUsecase: DesignsUsecase;
  designJobsUsecase: DesignJobsUsecase;
  projectsUsecase: ProjectsUsecase;
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
        'X-Design-Id',
        'X-Trace-Id',
        'X-Origin-Request-Id',
      ],
      exposeHeaders: ['X-Request-Id', 'X-Trace-Id'],
    }),
  );

  // request context / requestId
  app.use('*', async (c, next) => {
    const requestId = randomUUID();
    const designId = c.req.header('x-design-id')?.trim() || null;
    const incomingTraceId = c.req.header('x-trace-id')?.trim() || null;
    const traceId = incomingTraceId ?? designId ?? requestId;
    c.set('requestId', requestId);
    c.set('designId', designId);
    c.set('traceId', traceId);
    c.header('X-Request-Id', requestId);
    c.header('X-Trace-Id', traceId);
    await next();
  });

  app.use('*', async (c, next) => {
    c.set('usecases', {
      designs: dependencies.designsUsecase,
      designJobs: dependencies.designJobsUsecase,
      projects: dependencies.projectsUsecase,
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
  app.route('/designs', createDesignsRoutes());
  app.route('/design-jobs', createDesignJobsRoutes());
  app.route('/projects', createProjectsRoutes());
  app.route('/users', createUsersRoutes());
  app.route('/billing', createBillingRoutes());
  return app;
}
