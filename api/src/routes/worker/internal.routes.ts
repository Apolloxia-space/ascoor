import { Hono } from 'hono';
import type { AppEnv } from '../../entities/app-env';
import { NotFoundError } from '../../usecases/errors';

export function createInternalRoutes() {
  const router = new Hono<AppEnv>();

  router.post('/pack-generation-jobs/:packGenerationJobId/run', async (c) => {
    const packGenerationJobId = c.req.param('packGenerationJobId');
    const usecase = c.get('usecases').packGenerationJobs;
    try {
      await usecase.execute({
        type: 'process',
        packGenerationJobId,
        traceContext: {
          requestId: c.get('requestId'),
          traceId: c.get('traceId'),
        },
      });
      return c.json({ status: 'ok' }, 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  });

  router.post('/pack-generation-jobs/reap-stale', async (c) => {
    const usecase = c.get('usecases').packGenerationJobs;
    const rawLimit = c.req.query('limit');
    const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : undefined;
    const limit = Number.isFinite(parsedLimit) && (parsedLimit ?? 0) > 0 ? parsedLimit : undefined;
    const data = await usecase.maintenance({ type: 'reapStaleRunning', limit });
    return c.json({ status: 'ok', data }, 200);
  });

  router.post('/users/cleanup', async (c) => {
    const usecase = c.get('usecases').users;
    const rawLimit = c.req.query('limit');
    const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : undefined;
    const limit = Number.isFinite(parsedLimit) && (parsedLimit ?? 0) > 0 ? parsedLimit : undefined;
    const data = await usecase.reapPendingCleanupTasks(limit);
    return c.json({ status: 'ok', data }, 200);
  });

  return router;
}
