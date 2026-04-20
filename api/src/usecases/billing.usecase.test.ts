import assert from 'node:assert/strict';
import test from 'node:test';

import type { BillingRepository } from '../repositories/postgres/billing.repository';
import type { DesignJobRepositoryPostgres } from '../repositories/postgres/design-job.repository';
import type {
  StripeRepository,
  StripeWebhookEvent,
} from '../repositories/stripe/stripe.repository';
import { BillingUsecase } from './billing.usecase';

function createUsecase(params: {
  billingRepository: BillingRepository;
  stripeEvent: StripeWebhookEvent;
}) {
  const stripeRepository = {
    constructWebhookEvent: async () => params.stripeEvent,
  } as unknown as StripeRepository;

  const designJobRepository = {
    countSucceededByUserInPeriod: async () => 0,
  } as unknown as DesignJobRepositoryPostgres;

  return new BillingUsecase(
    params.billingRepository,
    stripeRepository,
    designJobRepository,
    'https://ascoor.app',
  );
}

test('handleWebhook atomically upserts subscription for subscription events', async () => {
  const upsertCalls: Array<{
    stripeEventId: string;
    eventCreatedAt: Date;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    userId: string;
    stripePriceId: string | null | undefined;
    status: string;
  }> = [];
  const recordCalls: Array<string> = [];

  const usecase = createUsecase({
    billingRepository: {
      upsertSubscriptionByStripeEvent: async (params: {
        stripeEventId: string;
        eventCreatedAt: Date;
        stripeSubscriptionId: string;
        stripeCustomerId: string;
        userId: string;
        stripePriceId?: string | null;
        status: string;
      }) => {
        upsertCalls.push({
          stripeEventId: params.stripeEventId,
          eventCreatedAt: params.eventCreatedAt,
          stripeSubscriptionId: params.stripeSubscriptionId,
          stripeCustomerId: params.stripeCustomerId,
          userId: params.userId,
          stripePriceId: params.stripePriceId,
          status: params.status,
        });
        return true;
      },
      recordStripeEventIfFirst: async (params: { stripeEventId: string; type: string }) => {
        recordCalls.push(params.stripeEventId);
        return true;
      },
    } as unknown as BillingRepository,
    stripeEvent: {
      id: 'evt_sub_1',
      created: 1735689600,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_123',
          status: 'active',
          customer: 'cus_123',
          current_period_start: 1735689600,
          current_period_end: 1738368000,
          cancel_at_period_end: false,
          metadata: {
            userId: 'user-1',
          },
          items: {
            data: [
              {
                price: { id: 'price_pro_monthly' },
              },
            ],
          },
        },
      },
    } as unknown as StripeWebhookEvent,
  });

  const event = await usecase.handleWebhook({ payload: '{}', signature: 'sig' });

  assert.equal(event.id, 'evt_sub_1');
  assert.equal(upsertCalls.length, 1);
  assert.equal(upsertCalls[0]?.stripeEventId, 'evt_sub_1');
  assert.equal(upsertCalls[0]?.stripeSubscriptionId, 'sub_123');
  assert.equal(upsertCalls[0]?.stripeCustomerId, 'cus_123');
  assert.equal(upsertCalls[0]?.userId, 'user-1');
  assert.equal(upsertCalls[0]?.stripePriceId, 'price_pro_monthly');
  assert.equal(upsertCalls[0]?.status, 'active');
  assert.equal(upsertCalls[0]?.eventCreatedAt.getTime(), 1735689600 * 1000);
  assert.equal(recordCalls.length, 0);
});

test('handleWebhook stores event only when subscription link is missing', async () => {
  const recordCalls: Array<{ stripeEventId: string; type: string }> = [];
  let upsertCalls = 0;

  const usecase = createUsecase({
    billingRepository: {
      upsertSubscriptionByStripeEvent: async () => {
        upsertCalls += 1;
        return true;
      },
      recordStripeEventIfFirst: async (params: { stripeEventId: string; type: string }) => {
        recordCalls.push({ stripeEventId: params.stripeEventId, type: params.type });
        return true;
      },
    } as unknown as BillingRepository,
    stripeEvent: {
      id: 'evt_sub_missing_link',
      created: 1735689700,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_456',
          status: 'active',
          customer: 'cus_456',
          metadata: {},
          items: { data: [] },
        },
      },
    } as unknown as StripeWebhookEvent,
  });

  await usecase.handleWebhook({ payload: '{}', signature: 'sig' });

  assert.equal(upsertCalls, 0);
  assert.deepEqual(recordCalls, [
    { stripeEventId: 'evt_sub_missing_link', type: 'customer.subscription.updated' },
  ]);
});

test('handleWebhook records non-subscription events idempotently', async () => {
  const recordCalls: Array<{ stripeEventId: string; type: string }> = [];

  const usecase = createUsecase({
    billingRepository: {
      upsertSubscriptionByStripeEvent: async () => true,
      recordStripeEventIfFirst: async (params: { stripeEventId: string; type: string }) => {
        recordCalls.push({ stripeEventId: params.stripeEventId, type: params.type });
        return false;
      },
    } as unknown as BillingRepository,
    stripeEvent: {
      id: 'evt_invoice_1',
      created: 1735689800,
      type: 'invoice.paid',
      data: { object: { id: 'in_123' } },
    } as unknown as StripeWebhookEvent,
  });

  const event = await usecase.handleWebhook({ payload: '{}', signature: 'sig' });

  assert.equal(event.id, 'evt_invoice_1');
  assert.deepEqual(recordCalls, [{ stripeEventId: 'evt_invoice_1', type: 'invoice.paid' }]);
});

test('getUsage counts succeeded generated designs in the current UTC month', async () => {
  const countCalls: Array<{ userId: string; periodStart: Date; periodEnd: Date }> = [];
  const realDate = Date;

  globalThis.Date = class extends Date {
    constructor(value?: string | number | Date) {
      super(value ?? '2026-03-16T09:00:00.000Z');
    }

    static now() {
      return new realDate('2026-03-16T09:00:00.000Z').getTime();
    }

    static parse = realDate.parse;
    static UTC = realDate.UTC;
  } as DateConstructor;

  try {
    const usecase = new BillingUsecase(
      {
        findSubscriptionByUserId: async () => ({ status: 'active', planId: 'plan-pro' }) as never,
        findPlanById: async () => ({ key: 'pro' }) as never,
        findPlanDesignLimit: async () => ({ planKey: 'pro', monthlyDesignLimit: 100 }) as never,
      } as unknown as BillingRepository,
      {} as unknown as StripeRepository,
      {
        countSucceededByUserInPeriod: async (params: {
          userId: string;
          periodStart: Date;
          periodEnd: Date;
        }) => {
          countCalls.push(params);
          return 3;
        },
      } as unknown as DesignJobRepositoryPostgres,
      'https://ascoor.app',
    );

    const usage = await usecase.getUsage('user-1');

    assert.equal(usage.used, 3);
    assert.equal(usage.limit, 100);
    assert.equal(usage.periodStart.toISOString(), '2026-03-01T00:00:00.000Z');
    assert.equal(usage.periodEnd.toISOString(), '2026-04-01T00:00:00.000Z');
    assert.equal(countCalls.length, 1);
    assert.equal(countCalls[0]?.userId, 'user-1');
    assert.equal(countCalls[0]?.periodStart.toISOString(), '2026-03-01T00:00:00.000Z');
    assert.equal(countCalls[0]?.periodEnd.toISOString(), '2026-04-01T00:00:00.000Z');
  } finally {
    globalThis.Date = realDate;
  }
});

test('getUsage returns free plan usage when no paid subscription exists', async () => {
  const countCalls: Array<{ userId: string; periodStart: Date; periodEnd: Date }> = [];
  const realDate = Date;

  globalThis.Date = class extends Date {
    constructor(value?: string | number | Date) {
      super(value ?? '2026-03-16T09:00:00.000Z');
    }

    static now() {
      return new realDate('2026-03-16T09:00:00.000Z').getTime();
    }

    static parse = realDate.parse;
    static UTC = realDate.UTC;
  } as DateConstructor;

  try {
    const usecase = new BillingUsecase(
      {
        findSubscriptionByUserId: async () => null,
        findPlanDesignLimit: async () => ({ planKey: 'free', monthlyDesignLimit: 5 }) as never,
      } as unknown as BillingRepository,
      {} as unknown as StripeRepository,
      {
        countSucceededByUserInPeriod: async (params: {
          userId: string;
          periodStart: Date;
          periodEnd: Date;
        }) => {
          countCalls.push(params);
          return 3;
        },
      } as unknown as DesignJobRepositoryPostgres,
      'https://ascoor.app',
    );

    const usage = await usecase.getUsage('user-1');

    assert.equal(usage.used, 3);
    assert.equal(usage.limit, 5);
    assert.equal(usage.periodStart.toISOString(), '2026-03-01T00:00:00.000Z');
    assert.equal(usage.periodEnd.toISOString(), '2026-04-01T00:00:00.000Z');
    assert.equal(countCalls.length, 1);
  } finally {
    globalThis.Date = realDate;
  }
});

test('createCheckoutSession uses traceId to derive idempotency key', async () => {
  const idempotencyKeys: Array<string> = [];
  const trialPeriodDays: Array<number | undefined> = [];
  const usecase = new BillingUsecase(
    {
      findPlanById: async () => null,
      findPlanByKey: async () =>
        ({
          id: 'plan-pro',
          name: 'Pro',
          key: 'pro',
          stripePriceId: 'price_pro_monthly',
        }) as never,
      findSubscriptionByUserId: async () => null,
    } as unknown as BillingRepository,
    {
      createCheckoutSession: async (params: {
        idempotencyKey: string;
        trialPeriodDays?: number;
      }) => {
        idempotencyKeys.push(params.idempotencyKey);
        trialPeriodDays.push(params.trialPeriodDays);
        return { url: 'https://checkout.stripe.test/session' };
      },
    } as unknown as StripeRepository,
    {
      countSucceededByUserInPeriod: async () => 0,
    } as unknown as DesignJobRepositoryPostgres,
    'https://ascoor.app',
  );

  await usecase.createCheckoutSession({
    userId: 'user-1',
    userEmail: 'test@example.com',
    traceId: 'req-1',
  });
  await usecase.createCheckoutSession({
    userId: 'user-1',
    userEmail: 'test@example.com',
    traceId: 'req-1',
  });
  await usecase.createCheckoutSession({
    userId: 'user-1',
    userEmail: 'test@example.com',
    traceId: 'req-2',
  });

  assert.equal(idempotencyKeys.length, 3);
  assert.equal(idempotencyKeys[0], idempotencyKeys[1]);
  assert.notEqual(idempotencyKeys[1], idempotencyKeys[2]);
  assert.deepEqual(trialPeriodDays, [undefined, undefined, undefined]);
});

test('cancelSubscriptionAtPeriodEnd always schedules period-end cancellation', async () => {
  const cancelCalls: Array<{ subscriptionId: string; cancelAtPeriodEnd: boolean }> = [];
  const upsertCalls: Array<{ cancelAtPeriodEnd?: boolean }> = [];

  const usecase = new BillingUsecase(
    {
      findSubscriptionByUserId: async () =>
        ({
          id: 'sub-db-1',
          userId: 'user-1',
          planId: 'plan-pro',
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
          status: 'active',
          currentPeriodStart: new Date('2026-02-01T00:00:00.000Z'),
          currentPeriodEnd: new Date('2026-03-01T00:00:00.000Z'),
          canceledAt: null,
          endedAt: null,
        }) as never,
      createCancellationFeedback: async () => undefined,
      upsertSubscriptionByUserId: async (params: { cancelAtPeriodEnd?: boolean }) => {
        upsertCalls.push({ cancelAtPeriodEnd: params.cancelAtPeriodEnd });
        return {} as never;
      },
    } as unknown as BillingRepository,
    {
      cancelSubscription: async (params: {
        subscriptionId: string;
        cancelAtPeriodEnd: boolean;
      }) => {
        cancelCalls.push(params);
      },
    } as unknown as StripeRepository,
    {
      countSucceededByUserInPeriod: async () => 0,
    } as unknown as DesignJobRepositoryPostgres,
    'https://ascoor.app',
  );

  await usecase.cancelSubscriptionAtPeriodEnd({ userId: 'user-1' });

  assert.equal(cancelCalls.length, 1);
  assert.equal(cancelCalls[0]?.subscriptionId, 'sub_123');
  assert.equal(cancelCalls[0]?.cancelAtPeriodEnd, true);
  assert.equal(upsertCalls.length, 1);
  assert.equal(upsertCalls[0]?.cancelAtPeriodEnd, true);
});

test('cancelSubscriptionImmediately performs immediate Stripe cancellation', async () => {
  const immediateCancelCalls: Array<{ subscriptionId: string }> = [];
  const upsertCalls: Array<{ status?: string; cancelAtPeriodEnd?: boolean }> = [];

  const usecase = new BillingUsecase(
    {
      findSubscriptionByUserId: async () =>
        ({
          id: 'sub-db-1',
          userId: 'user-1',
          planId: 'plan-pro',
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
          status: 'active',
          currentPeriodStart: new Date('2026-02-01T00:00:00.000Z'),
          currentPeriodEnd: new Date('2026-03-01T00:00:00.000Z'),
          canceledAt: null,
          endedAt: null,
        }) as never,
      createCancellationFeedback: async () => undefined,
      upsertSubscriptionByUserId: async (params: {
        status?: string;
        cancelAtPeriodEnd?: boolean;
      }) => {
        upsertCalls.push({ status: params.status, cancelAtPeriodEnd: params.cancelAtPeriodEnd });
        return {} as never;
      },
    } as unknown as BillingRepository,
    {
      cancelSubscriptionImmediately: async (params: { subscriptionId: string }) => {
        immediateCancelCalls.push(params);
      },
    } as unknown as StripeRepository,
    {
      countSucceededByUserInPeriod: async () => 0,
    } as unknown as DesignJobRepositoryPostgres,
    'https://ascoor.app',
  );

  await usecase.cancelSubscriptionImmediately({ userId: 'user-1' });

  assert.equal(immediateCancelCalls.length, 1);
  assert.equal(immediateCancelCalls[0]?.subscriptionId, 'sub_123');
  assert.equal(upsertCalls.length, 1);
  assert.equal(upsertCalls[0]?.status, 'canceled');
  assert.equal(upsertCalls[0]?.cancelAtPeriodEnd, false);
});

test('resumeSubscriptionCancellation removes period-end cancel schedule', async () => {
  const cancelCalls: Array<{ subscriptionId: string; cancelAtPeriodEnd: boolean }> = [];
  const upsertCalls: Array<{ cancelAtPeriodEnd?: boolean; canceledAt?: Date | null }> = [];

  const usecase = new BillingUsecase(
    {
      findSubscriptionByUserId: async () =>
        ({
          id: 'sub-db-1',
          userId: 'user-1',
          planId: 'plan-pro',
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
          status: 'active',
          currentPeriodStart: new Date('2026-02-01T00:00:00.000Z'),
          currentPeriodEnd: new Date('2026-03-01T00:00:00.000Z'),
          canceledAt: new Date('2026-02-15T00:00:00.000Z'),
          endedAt: null,
        }) as never,
      upsertSubscriptionByUserId: async (params: {
        cancelAtPeriodEnd?: boolean;
        canceledAt?: Date | null;
      }) => {
        upsertCalls.push({
          cancelAtPeriodEnd: params.cancelAtPeriodEnd,
          canceledAt: params.canceledAt,
        });
        return {} as never;
      },
    } as unknown as BillingRepository,
    {
      cancelSubscription: async (params: {
        subscriptionId: string;
        cancelAtPeriodEnd: boolean;
      }) => {
        cancelCalls.push(params);
      },
    } as unknown as StripeRepository,
    {
      countSucceededByUserInPeriod: async () => 0,
    } as unknown as DesignJobRepositoryPostgres,
    'https://ascoor.app',
  );

  await usecase.resumeSubscriptionCancellation({ userId: 'user-1' });

  assert.equal(cancelCalls.length, 1);
  assert.equal(cancelCalls[0]?.subscriptionId, 'sub_123');
  assert.equal(cancelCalls[0]?.cancelAtPeriodEnd, false);
  assert.equal(upsertCalls.length, 1);
  assert.equal(upsertCalls[0]?.cancelAtPeriodEnd, false);
  assert.equal(upsertCalls[0]?.canceledAt, null);
});
