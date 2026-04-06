import assert from 'node:assert/strict';
import test from 'node:test';
import type Stripe from 'stripe';
import { StripeRepositoryStripe } from './stripe.repository';

test('createCheckoutSession enables Stripe Tax and updates existing customer address', async () => {
  let capturedParams: Stripe.Checkout.SessionCreateParams | undefined;
  let capturedRequestOptions: { idempotencyKey?: string } | undefined;

  const stripe = {
    checkout: {
      sessions: {
        create: async (
          params: Stripe.Checkout.SessionCreateParams,
          requestOptions?: { idempotencyKey?: string },
        ) => {
          capturedParams = params;
          capturedRequestOptions = requestOptions;
          return {
            url: 'https://checkout.stripe.test/session',
            customer: 'cus_123',
          };
        },
      },
    },
  } as unknown as Stripe;

  const repository = new StripeRepositoryStripe(stripe, 'whsec_test');

  const session = await repository.createCheckoutSession({
    userId: 'user-1',
    priceId: 'price_pro_monthly',
    successUrl: 'https://ascoor.app/plans?status=success',
    cancelUrl: 'https://ascoor.app/plans?status=cancel',
    idempotencyKey: 'checkout_123',
    trialPeriodDays: 7,
    customerId: 'cus_123',
    customerEmail: 'test@example.com',
  });

  assert.equal(session.url, 'https://checkout.stripe.test/session');
  assert.equal(session.customerId, 'cus_123');
  assert.equal(capturedParams?.payment_method_collection, 'always');
  assert.equal(capturedParams?.automatic_tax?.enabled, true);
  assert.equal(capturedParams?.billing_address_collection, 'required');
  assert.equal(capturedParams?.subscription_data?.trial_period_days, 7);
  assert.equal(capturedParams?.customer, 'cus_123');
  assert.equal(capturedParams?.customer_email, undefined);
  assert.deepEqual(capturedParams?.customer_update, {
    address: 'auto',
    name: 'auto',
  });
  assert.equal(capturedRequestOptions?.idempotencyKey, 'checkout_123');
});

test('createCheckoutSession omits customer_update when customer does not exist yet', async () => {
  let capturedParams: Stripe.Checkout.SessionCreateParams | undefined;

  const stripe = {
    checkout: {
      sessions: {
        create: async (params: Stripe.Checkout.SessionCreateParams) => {
          capturedParams = params;
          return {
            url: 'https://checkout.stripe.test/session',
            customer: { id: 'cus_new' },
          };
        },
      },
    },
  } as unknown as Stripe;

  const repository = new StripeRepositoryStripe(stripe, 'whsec_test');

  const session = await repository.createCheckoutSession({
    userId: 'user-1',
    priceId: 'price_pro_monthly',
    successUrl: 'https://ascoor.app/plans?status=success',
    cancelUrl: 'https://ascoor.app/plans?status=cancel',
    idempotencyKey: 'checkout_456',
    customerEmail: 'test@example.com',
  });

  assert.equal(session.customerId, 'cus_new');
  assert.equal(capturedParams?.payment_method_collection, 'always');
  assert.equal(capturedParams?.automatic_tax?.enabled, true);
  assert.equal(capturedParams?.billing_address_collection, 'required');
  assert.equal(capturedParams?.subscription_data?.trial_period_days, undefined);
  assert.equal(capturedParams?.customer, undefined);
  assert.equal(capturedParams?.customer_email, 'test@example.com');
  assert.equal(capturedParams?.customer_update, undefined);
});
