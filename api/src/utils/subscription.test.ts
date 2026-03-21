import assert from 'node:assert/strict';
import test from 'node:test';
import type { Subscription } from '../entities/subscription';
import {
  buildSubscriptionUpsertInput,
  isProSubscriptionStatus,
  isStripeManagedSubscriptionStatus,
  parseStripeSubscriptionWebhook,
} from './subscription';

test('isProSubscriptionStatus returns true for pro statuses only', () => {
  assert.equal(isProSubscriptionStatus('active'), true);
  assert.equal(isProSubscriptionStatus('trialing'), true);
  assert.equal(isProSubscriptionStatus('canceled'), false);
});

test('isStripeManagedSubscriptionStatus returns true for Stripe-managed statuses only', () => {
  assert.equal(isStripeManagedSubscriptionStatus('active'), true);
  assert.equal(isStripeManagedSubscriptionStatus('paused'), true);
  assert.equal(isStripeManagedSubscriptionStatus('incomplete_expired'), false);
  assert.equal(isStripeManagedSubscriptionStatus('canceled'), false);
});

test('parseStripeSubscriptionWebhook extracts customer, periods, and metadata', () => {
  const parsed = parseStripeSubscriptionWebhook({
    id: 'sub_123',
    status: 'active',
    customer: { id: ' cus_123 ' },
    metadata: { userId: ' user-1 ' },
    cancel_at_period_end: true,
    canceled_at: 1735776000,
    items: {
      data: [
        {
          price: { id: ' price_pro_monthly ' },
          current_period_start: 1735689600,
          current_period_end: 1738368000,
        },
      ],
    },
  });

  assert.equal(parsed.stripeSubscriptionId, 'sub_123');
  assert.equal(parsed.stripeCustomerId, 'cus_123');
  assert.equal(parsed.userId, 'user-1');
  assert.equal(parsed.stripePriceId, 'price_pro_monthly');
  assert.equal(parsed.currentPeriodStart?.toISOString(), '2025-01-01T00:00:00.000Z');
  assert.equal(parsed.currentPeriodEnd?.toISOString(), '2025-02-01T00:00:00.000Z');
  assert.equal(parsed.cancelAtPeriodEnd, true);
  assert.equal(parsed.canceledAt?.toISOString(), '2025-01-02T00:00:00.000Z');
});

test('buildSubscriptionUpsertInput applies overrides with base subscription values', () => {
  const baseSubscription = {
    id: 'db-sub-1',
    userId: 'user-1',
    planId: 'plan-pro',
    stripeCustomerId: 'cus_123',
    stripeSubscriptionId: 'sub_123',
    status: 'active',
    currentPeriodStart: new Date('2025-01-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2025-02-01T00:00:00.000Z'),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    endedAt: null,
    lastStripeEventCreatedAt: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
  } as Subscription;

  const upsert = buildSubscriptionUpsertInput({
    userId: 'user-1',
    subscription: baseSubscription,
    overrides: {
      status: 'canceled',
      cancelAtPeriodEnd: false,
      canceledAt: new Date('2025-01-02T00:00:00.000Z'),
      endedAt: new Date('2025-01-02T00:00:00.000Z'),
    },
  });

  assert.equal(upsert.userId, 'user-1');
  assert.equal(upsert.stripeCustomerId, 'cus_123');
  assert.equal(upsert.stripeSubscriptionId, 'sub_123');
  assert.equal(upsert.status, 'canceled');
  assert.equal(upsert.planId, 'plan-pro');
  assert.equal(upsert.currentPeriodStart?.toISOString(), '2025-01-01T00:00:00.000Z');
  assert.equal(upsert.currentPeriodEnd?.toISOString(), '2025-02-01T00:00:00.000Z');
  assert.equal(upsert.canceledAt?.toISOString(), '2025-01-02T00:00:00.000Z');
  assert.equal(upsert.endedAt?.toISOString(), '2025-01-02T00:00:00.000Z');
});
