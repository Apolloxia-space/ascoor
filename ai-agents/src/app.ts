import { Hono } from 'hono';
import { createDependencies, type AgentDependencies } from './dependencies';
import { logException } from './logger';
import { registerAssetPackPlanRoutes } from './routes/asset-pack-plan.routes';
import { registerRequestContextMiddleware } from './routes/context.middleware';
import { registerAssetPackRoutes } from './routes/asset-pack.routes';
import { registerPromptCompileRoutes } from './routes/prompt-compile.routes';
import { registerTitleRoutes } from './routes/title.routes';
import type { AppBindings } from './routes/types';
import { InvokeError, toInvokeErrorOut } from './usecases/errors';

export type AppDependencies = AgentDependencies;

export function createApp(dependencies: AppDependencies = createDependencies()): Hono<AppBindings> {
  const app = new Hono<AppBindings>();

  registerRequestContextMiddleware(app);

  app.get('/healthz', (c) => c.json({ ok: true }));
  registerAssetPackPlanRoutes(app, dependencies.assetPackPlanUsecase);
  registerAssetPackRoutes(app, dependencies.assetPackUsecase);
  registerTitleRoutes(app, dependencies.titleUsecase);
  registerPromptCompileRoutes(app, dependencies.promptCompileUsecase);

  app.onError((error, c) => {
    if (error instanceof InvokeError) {
      return new Response(JSON.stringify(toInvokeErrorOut(error)), {
        status: error.statusCode,
        headers: { 'content-type': 'application/json' },
      });
    }

    logException('ai_agent.unhandled_error', error, {
      request_id: c.get('requestId'),
      trace_id: c.get('traceId'),
      pack_generation_job_id: c.get('packGenerationJobId'),
      method: c.req.method,
      path: c.req.path,
    });

    return c.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error.',
          requestId: c.get('requestId'),
          traceId: c.get('traceId'),
          packGenerationJobId: c.get('packGenerationJobId') || undefined,
        },
      },
      500,
    );
  });

  return app;
}
