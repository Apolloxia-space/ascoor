import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  GetDesignJobParams,
} from '../../generated/endpoints/design-jobs/design-jobs.zod';
import type {
  CreateDesignJobContext,
  GetDesignJobContext,
} from '../../generated/endpoints/design-jobs/design-jobs.context';
import type { AppEnv } from '../../entities/app-env';
import {
  DesignQuotaExceededError,
  DesignValidationError,
  NotFoundError,
  ProSubscriptionRequiredError,
} from '../../usecases/errors';
import { createDesignJobBodySchema } from './request-schemas';

export function createDesignJobsRoutes() {
  const router = new Hono<AppEnv>();

  router.post(
    '/',
    zValidator('json', createDesignJobBodySchema),
    async (c: CreateDesignJobContext<AppEnv>) => {
      const { projectId, userPrompt } = c.req.valid('json');
      const userId = c.get('md').userId;
      const usecase = c.get('usecases').designJobs;
      try {
        const data = await usecase.execute({
          type: 'enqueue',
          input: { projectId, userPrompt, userId },
          traceContext: {
            requestId: c.get('requestId'),
            traceId: c.get('traceId'),
          },
        });
        return c.json(data, 202);
      } catch (error: unknown) {
        if (error instanceof ProSubscriptionRequiredError) {
          return c.json({ error: error.message, code: error.code }, 402);
        }
        if (error instanceof DesignQuotaExceededError) {
          return c.json({ error: error.message, code: error.code }, 429);
        }
        if (error instanceof DesignValidationError) {
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
    '/:designJobId',
    zValidator('param', GetDesignJobParams),
    async (c: GetDesignJobContext<AppEnv>) => {
      const { designJobId } = c.req.valid('param');
      const userId = c.get('md').userId;
      const usecase = c.get('usecases').designJobs;
      try {
        const data = await usecase.query({ type: 'get', userId, designJobId });
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
