import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrismaClient } from '../../generated/prisma/client';
import { BillingRepositoryPostgres } from './billing.repository';

test('upsertSubscriptionByStripeEvent records event and skips subscription sync when user is missing', async () => {
  let executeRawCalls = 0;
  let planLookups = 0;

  const tx = {
    stripeEvent: {
      createMany: async () => ({ count: 1 }),
    },
    user: {
      findUnique: async () => null,
    },
    plan: {
      findUnique: async () => {
        planLookups += 1;
        return null;
      },
    },
    $executeRaw: async () => {
      executeRawCalls += 1;
      return 0;
    },
  };

  const prisma = {
    $transaction: async <T>(callback: (tx: unknown) => Promise<T>) => callback(tx),
  } as unknown as PrismaClient;

  const repository = new BillingRepositoryPostgres(prisma);

  const result = await repository.upsertSubscriptionByStripeEvent({
    stripeEventId: 'evt_deleted_1',
    eventCreatedAt: new Date('2026-03-18T11:49:11.000Z'),
    type: 'customer.subscription.deleted',
    payload: { id: 'evt_deleted_1' },
    userId: 'deleted-user',
    stripeCustomerId: 'cus_123',
    stripeSubscriptionId: 'sub_123',
    status: 'canceled',
    stripePriceId: 'price_pro_monthly',
    currentPeriodStart: new Date('2026-02-24T06:24:01.000Z'),
    currentPeriodEnd: new Date('2026-03-24T06:24:01.000Z'),
    cancelAtPeriodEnd: false,
    canceledAt: new Date('2026-03-18T11:49:11.000Z'),
    endedAt: new Date('2026-03-18T11:49:11.000Z'),
  });

  assert.equal(result, true);
  assert.equal(planLookups, 0);
  assert.equal(executeRawCalls, 0);
});
