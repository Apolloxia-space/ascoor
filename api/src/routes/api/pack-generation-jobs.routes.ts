import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  GetPackGenerationJobParams,
} from '../../generated/endpoints/pack-generation-jobs/pack-generation-jobs.zod';
import type {
  CreatePackGenerationJobContext,
  GetPackGenerationJobContext,
} from '../../generated/endpoints/pack-generation-jobs/pack-generation-jobs.context';
import type { AppEnv } from '../../entities/app-env';
import {
  AssetPackConcurrencyLimitExceededError,
  AssetPackQuotaExceededError,
  AssetPackValidationError,
  NotFoundError,
} from '../../usecases/errors';
import { createPackGenerationJobBodySchema } from './request-schemas';

export function createPackGenerationJobsRoutes() {
  const router = new Hono<AppEnv>();

  router.post(
    '/',
    zValidator('json', createPackGenerationJobBodySchema),
    async (c: CreatePackGenerationJobContext<AppEnv>) => {
      const { workspaceId, userPrompt } = c.req.valid('json');
      const userId = c.get('md').userId;
      const usecase = c.get('usecases').packGenerationJobs;
      try {
        const data = await usecase.execute({
          type: 'enqueue',
          input: { workspaceId, userPrompt, userId },
          traceContext: {
            requestId: c.get('requestId'),
            traceId: c.get('traceId'),
          },
        });
        return c.json(data, 202);
      } catch (error: unknown) {
        if (error instanceof AssetPackConcurrencyLimitExceededError) {
          return c.json({ error: error.message, code: error.code }, 409);
        }
        if (error instanceof AssetPackQuotaExceededError) {
          return c.json({ error: error.message, code: error.code }, 429);
        }
        if (error instanceof AssetPackValidationError) {
          return c.json({ error: error.message }, 400);
        }
        if (error instanceof NotFoundError) {
          return c.json({ error: error.message }, 404);
        }
        throw error;
      }
    },
  );

  router.get(
    '/:packGenerationJobId',
    zValidator('param', GetPackGenerationJobParams),
    async (c: GetPackGenerationJobContext<AppEnv>) => {
      const { packGenerationJobId } = c.req.valid('param');
      const userId = c.get('md').userId;
      const usecase = c.get('usecases').packGenerationJobs;
      try {
        const data = await usecase.query({ type: 'get', userId, packGenerationJobId });
        return c.json(data, 200);
      } catch (error) {
        if (error instanceof NotFoundError) {
          return c.json({ error: error.message }, 404);
        }
        throw error;
      }
    },
  );

  return router;
}
