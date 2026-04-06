import type Stripe from 'stripe';
import { NotImplementedError, ValidationError } from '../../usecases/errors';

export type StripeWebhookEvent = Stripe.Event;

export interface StripeRepository {
  createCheckoutSession(params: {
    userId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    idempotencyKey: string;
    trialPeriodDays?: number;
    customerId?: string | null;
    customerEmail?: string | null;
  }): Promise<{ url: string; customerId?: string | null }>;
  createPortalSession(params: { customerId: string; returnUrl: string }): Promise<{ url: string }>;
  cancelSubscription(params: { subscriptionId: string; cancelAtPeriodEnd: boolean }): Promise<void>;
  cancelSubscriptionImmediately(params: { subscriptionId: string }): Promise<void>;
  constructWebhookEvent(params: {
    payload: string | Uint8Array;
    signature: string;
  }): Promise<StripeWebhookEvent>;
}

export class StripeRepositoryStripe implements StripeRepository {
  constructor(
    private readonly stripe: Stripe,
    private readonly webhookSecret: string | null,
  ) {}

  async createCheckoutSession(params: {
    userId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    idempotencyKey: string;
    trialPeriodDays?: number;
    customerId?: string | null;
    customerEmail?: string | null;
  }): Promise<{ url: string; customerId?: string | null }> {
    const createParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_collection: 'always',
      line_items: [{ price: params.priceId, quantity: 1 }],
      automatic_tax: {
        enabled: true,
      },
      billing_address_collection: 'required',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.userId,
      subscription_data: {
        metadata: {
          userId: params.userId,
        },
        ...(typeof params.trialPeriodDays === 'number' ? { trial_period_days: params.trialPeriodDays } : {}),
      },
      metadata: {
        userId: params.userId,
      },
    };

    if (params.customerId) {
      createParams.customer = params.customerId;
      createParams.customer_update = {
        address: 'auto',
        name: 'auto',
      };
    } else if (params.customerEmail) {
      createParams.customer_email = params.customerEmail;
    }

    const session = await this.stripe.checkout.sessions.create(
      createParams,
      {
        idempotencyKey: params.idempotencyKey,
      },
    );

    return {
      url: session.url ?? '',
      customerId:
        typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null),
    };
  }

  async createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });

    return { url: session.url ?? '' };
  }

  async cancelSubscription(params: {
    subscriptionId: string;
    cancelAtPeriodEnd: boolean;
  }): Promise<void> {
    await this.stripe.subscriptions.update(params.subscriptionId, {
      cancel_at_period_end: params.cancelAtPeriodEnd,
    });
  }

  async cancelSubscriptionImmediately(params: { subscriptionId: string }): Promise<void> {
    await this.stripe.subscriptions.cancel(params.subscriptionId);
  }

  async constructWebhookEvent(params: {
    payload: string | Uint8Array;
    signature: string;
  }): Promise<StripeWebhookEvent> {
    if (!this.webhookSecret) {
      throw new ValidationError('stripe_webhook_secret_missing');
    }

    const payload =
      typeof params.payload === 'string' ? params.payload : Buffer.from(params.payload);
    try {
      return this.stripe.webhooks.constructEvent(payload, params.signature, this.webhookSecret);
    } catch {
      throw new ValidationError('invalid_webhook_signature');
    }
  }
}

export class StripeRepositoryStub implements StripeRepository {
  private notImplemented(): never {
    throw new NotImplementedError('stripe_not_configured');
  }

  createCheckoutSession(): Promise<{ url: string; customerId?: string | null }> {
    return this.notImplemented();
  }

  createPortalSession(): Promise<{ url: string }> {
    return this.notImplemented();
  }

  cancelSubscription(): Promise<void> {
    return this.notImplemented();
  }

  cancelSubscriptionImmediately(): Promise<void> {
    return this.notImplemented();
  }

  constructWebhookEvent(): Promise<StripeWebhookEvent> {
    return this.notImplemented();
  }
}
