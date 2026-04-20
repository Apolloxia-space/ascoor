import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

import type { AppEnv } from '../../entities/app-env';
import {
  ConflictError,
  NotFoundError,
  NotImplementedError,
  ValidationError,
} from '../../usecases/errors';
import { cancelBodySchema } from './request-schemas';

const checkoutSessionBody = z.object({
  planId: z.string().uuid().optional(),
  planKey: z.enum(['hobby', 'pro']).optional(),
});

export function createBillingRoutes() {
  const router = new Hono<AppEnv>();

  router.get('/status', async (c) => {
    const billingUsecase = c.get('usecases').billing;
    const userId = c.get('md').userId;
    const data = await billingUsecase.getStatus(userId);
    return c.json(data, 200);
  });

  router.get('/usage', async (c) => {
    const billingUsecase = c.get('usecases').billing;
    const userId = c.get('md').userId;
    const data = await billingUsecase.getUsage(userId);
    return c.json(data, 200);
  });

  router.post('/portal-session', async (c) => {
    const billingUsecase = c.get('usecases').billing;
    const userId = c.get('md').userId;

    try {
      const data = await billingUsecase.createPortalSession({ userId });
      return c.json(data, 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      if (error instanceof ValidationError) {
        return c.json({ error: error.message }, 400);
      }
      if (error instanceof NotImplementedError) {
        return c.json({ error: error.message }, 501);
      }
      throw error;
    }
  });

  router.post('/checkout-session', zValidator('json', checkoutSessionBody), async (c) => {
    const { planId, planKey } = c.req.valid('json');
    const billingUsecase = c.get('usecases').billing;
    const md = c.get('md');

    try {
      const data = await billingUsecase.createCheckoutSession({
        userId: md.userId,
        userEmail: md.userEmail ?? null,
        planId: planId ?? null,
        planKey: planKey ?? null,
        traceId: c.get('traceId'),
      });
      return c.json(data, 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      if (error instanceof ConflictError) {
        return c.json({ error: error.message }, 409);
      }
      if (error instanceof ValidationError) {
        return c.json({ error: error.message }, 400);
      }
      if (error instanceof NotImplementedError) {
        return c.json({ error: error.message }, 501);
      }
      throw error;
    }
  });

  router.post('/cancel', zValidator('json', cancelBodySchema), async (c) => {
    const { reason, details } = c.req.valid('json');
    const billingUsecase = c.get('usecases').billing;
    const userId = c.get('md').userId;

    try {
      await billingUsecase.cancelSubscriptionAtPeriodEnd({
        userId,
        reason,
        details,
      });
      return c.body(null, 204);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      if (error instanceof ValidationError) {
        return c.json({ error: error.message }, 400);
      }
      if (error instanceof NotImplementedError) {
        return c.json({ error: error.message }, 501);
      }
      throw error;
    }
  });

  router.post('/cancel-immediately', zValidator('json', cancelBodySchema), async (c) => {
    const { reason, details } = c.req.valid('json');
    const billingUsecase = c.get('usecases').billing;
    const userId = c.get('md').userId;

    try {
      await billingUsecase.cancelSubscriptionImmediately({
        userId,
        reason,
        details,
      });
      return c.body(null, 204);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      if (error instanceof ValidationError) {
        return c.json({ error: error.message }, 400);
      }
      if (error instanceof NotImplementedError) {
        return c.json({ error: error.message }, 501);
      }
      throw error;
    }
  });

  router.post('/resume-cancel', async (c) => {
    const billingUsecase = c.get('usecases').billing;
    const userId = c.get('md').userId;

    try {
      await billingUsecase.resumeSubscriptionCancellation({ userId });
      return c.body(null, 204);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      if (error instanceof ValidationError) {
        return c.json({ error: error.message }, 400);
      }
      if (error instanceof NotImplementedError) {
        return c.json({ error: error.message }, 501);
      }
      throw error;
    }
  });

  router.post('/webhook', async (c) => {
    const billingUsecase = c.get('usecases').billing;
    const signature = c.req.header('stripe-signature');

    if (!signature) {
      return c.json({ error: 'missing_signature' }, 400);
    }

    const payload = await c.req.text();

    try {
      const data = await billingUsecase.handleWebhook({ payload, signature });
      return c.json(data, 200);
    } catch (error) {
      if (error instanceof ValidationError) {
        return c.json({ error: error.message }, 400);
      }
      if (error instanceof NotImplementedError) {
        return c.json({ error: error.message }, 501);
      }
      throw error;
    }
  });

  return router;
}
