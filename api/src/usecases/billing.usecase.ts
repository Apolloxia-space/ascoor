import { createHash, randomUUID } from 'node:crypto';
import type { BillingStatus, BillingUsage } from '../entities/billing';
import type { PlanCreditAllowance, PlanKey } from '../generated/prisma/client';
import type {
  CancelSubscriptionReason,
  Plan,
  Subscription,
  SubscriptionStatus,
} from '../entities/subscription';
import type { BillingRepository } from '../repositories/postgres/billing.repository';
import type {
  StripeRepository,
  StripeWebhookEvent,
} from '../repositories/stripe/stripe.repository';
import { BillingCache } from '../repositories/inmemory/billing.cache';
import { ConflictError, NotFoundError, ValidationError } from './errors';
import { logger } from '../utils/logger';
import { getUtcMonthWindow } from '../utils/date';
import {
  buildSubscriptionUpsertInput,
  isActiveSubscriptionStatus,
  isStripeManagedSubscriptionStatus,
  parseStripeSubscriptionWebhook,
  type StripeSubscriptionWebhookObject,
} from '../utils/subscription';

export interface CheckoutSessionInput {
  userId: string;
  userEmail?: string | null;
  planId?: string | null;
  planKey?: 'hobby' | 'pro' | null;
  traceId?: string | null;
}

export interface CancelSubscriptionInput {
  userId: string;
  reason?: CancelSubscriptionReason;
  details?: string;
}

export interface WebhookInput {
  payload: string | Uint8Array;
  signature: string;
}

export interface CreatePortalSessionInput {
  userId: string;
}

export class BillingUsecase {
  private readonly billingCache = new BillingCache();

  constructor(
    private readonly billingRepository: BillingRepository,
    private readonly stripeRepository: StripeRepository,
    private readonly webAppBaseUrl: string | null,
  ) {}

  private getWebAppBaseUrl(): string {
    if (!this.webAppBaseUrl) {
      throw new ValidationError('web_app_base_url_missing');
    }
    return this.webAppBaseUrl;
  }

  async getStatus(userId: string): Promise<BillingStatus> {
    const subscription = await this.getCachedSubscription(userId);
    if (!subscription) {
      const freePlan = await this.getCachedPlanByKey('free');
      return {
        status: 'none',
        plan: freePlan,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    const plan = subscription.planId ? await this.getCachedPlanById(subscription.planId) : null;

    return {
      status: subscription.status,
      plan,
      currentPeriodEnd: subscription.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  }

  async getUsage(userId: string): Promise<BillingUsage> {
    const subscription = await this.getCachedSubscription(userId);
    const planKey = await this.resolveEffectivePlanKey(subscription);
    const now = new Date();
    const window = getUtcMonthWindow(now);
    const periodStart = window.start;
    const periodEnd = window.end;

    const allowance = await this.getCachedPlanCreditAllowance(planKey);
    if (!allowance) {
      logger.error('billing_plan_credit_allowance_missing', { planKey });
      throw new Error(`plan_credit_allowance_missing:${planKey}`);
    }

    await this.ensureMonthlyCreditGrant({
      userId,
      periodStart,
      periodEnd,
      monthlyCredits: allowance.monthlyCredits,
    });

    const balance = await this.billingRepository.sumCreditAmountByUserInPeriod({
      userId,
      periodStart,
      periodEnd,
    });

    return {
      balance,
      monthlyCredits: allowance.monthlyCredits,
      usedCredits: Math.max(0, allowance.monthlyCredits - balance),
      periodStart,
      periodEnd,
    };
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<{ url: string }> {
    const webAppBaseUrl = this.getWebAppBaseUrl();
    const plan = input.planId
      ? await this.getCachedPlanById(input.planId)
      : await this.getCachedPlanByKey(input.planKey ?? 'hobby');

    if (!plan) {
      throw new NotFoundError('plan_not_found');
    }
    if (plan.key === 'free') {
      throw new ValidationError('free_plan_checkout_not_supported');
    }
    if (!plan.stripePriceId) {
      throw new ValidationError(`stripe_price_missing:${plan.key}`);
    }

    const existingSubscription = await this.getCachedSubscription(input.userId);
    if (existingSubscription && isStripeManagedSubscriptionStatus(existingSubscription.status)) {
      throw new ConflictError('subscription_already_active');
    }

    const successUrl = new URL('/plans', webAppBaseUrl);
    successUrl.searchParams.set('status', 'success');
    const cancelUrl = new URL('/plans', webAppBaseUrl);
    cancelUrl.searchParams.set('status', 'cancel');
    const checkoutTraceId = input.traceId?.trim() || randomUUID();
    const checkoutIdempotencySeed = `${input.userId}:${plan.stripePriceId}:${checkoutTraceId}`;
    const idempotencyKey = `checkout_${createHash('sha256').update(checkoutIdempotencySeed).digest('hex')}`;

    const session = await this.stripeRepository.createCheckoutSession({
      userId: input.userId,
      customerEmail: input.userEmail ?? null,
      priceId: plan.stripePriceId,
      successUrl: successUrl.toString(),
      cancelUrl: cancelUrl.toString(),
      idempotencyKey,
      customerId: existingSubscription?.stripeCustomerId ?? null,
    });

    if (!session.url) {
      throw new ValidationError('checkout_session_url_missing');
    }

    return { url: session.url };
  }

  async createPortalSession(input: CreatePortalSessionInput): Promise<{ url: string }> {
    const webAppBaseUrl = this.getWebAppBaseUrl();
    const subscription = await this.getCachedSubscription(input.userId);
    if (!subscription?.stripeCustomerId) {
      throw new NotFoundError('subscription_not_found');
    }

    const returnUrl = new URL('/settings/billing', webAppBaseUrl);

    const session = await this.stripeRepository.createPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: returnUrl.toString(),
    });

    if (!session.url) {
      throw new ValidationError('portal_session_url_missing');
    }

    return { url: session.url };
  }

  private async recordCancellationFeedback(
    input: CancelSubscriptionInput,
    params: {
      subscriptionId: string;
      planId: string | null;
      status: SubscriptionStatus;
      cancelAtPeriodEnd: boolean;
    },
  ): Promise<void> {
    const trimmedDetails = input.details?.trim();
    try {
      await this.billingRepository.createCancellationFeedback({
        userId: input.userId,
        subscriptionId: params.subscriptionId,
        planId: params.planId,
        reason: input.reason ?? null,
        details: trimmedDetails && trimmedDetails.length > 0 ? trimmedDetails : null,
        cancelAtPeriodEnd: params.cancelAtPeriodEnd,
        status: params.status,
      });
    } catch (error) {
      logger.warn('billing_cancel_feedback_failed', {
        userId: input.userId,
        subscriptionId: params.subscriptionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async cancelSubscriptionAtPeriodEnd(input: CancelSubscriptionInput): Promise<void> {
    const subscription = await this.getCachedSubscription(input.userId);
    if (!subscription) {
      throw new NotFoundError('subscription_not_found');
    }

    await this.recordCancellationFeedback(input, {
      subscriptionId: subscription.id,
      planId: subscription.planId ?? null,
      status: subscription.status,
      cancelAtPeriodEnd: true,
    });

    await this.stripeRepository.cancelSubscription({
      subscriptionId: subscription.stripeSubscriptionId,
      cancelAtPeriodEnd: true,
    });

    await this.billingRepository.upsertSubscriptionByUserId(
      buildSubscriptionUpsertInput({
        userId: input.userId,
        subscription,
        overrides: {
          cancelAtPeriodEnd: true,
        },
      }),
    );
    this.invalidateSubscriptionCache(input.userId);
  }

  async cancelSubscriptionImmediately(input: CancelSubscriptionInput): Promise<void> {
    const subscription = await this.getCachedSubscription(input.userId);
    if (!subscription) {
      throw new NotFoundError('subscription_not_found');
    }

    await this.recordCancellationFeedback(input, {
      subscriptionId: subscription.id,
      planId: subscription.planId ?? null,
      status: subscription.status,
      cancelAtPeriodEnd: false,
    });

    await this.stripeRepository.cancelSubscriptionImmediately({
      subscriptionId: subscription.stripeSubscriptionId,
    });

    const now = new Date();
    await this.billingRepository.upsertSubscriptionByUserId(
      buildSubscriptionUpsertInput({
        userId: input.userId,
        subscription,
        overrides: {
          status: 'canceled',
          currentPeriodEnd: now,
          cancelAtPeriodEnd: false,
          canceledAt: now,
          endedAt: now,
        },
      }),
    );
    this.invalidateSubscriptionCache(input.userId);
  }

  async resumeSubscriptionCancellation(input: { userId: string }): Promise<void> {
    const subscription = await this.getCachedSubscription(input.userId);
    if (!subscription) {
      throw new NotFoundError('subscription_not_found');
    }

    await this.stripeRepository.cancelSubscription({
      subscriptionId: subscription.stripeSubscriptionId,
      cancelAtPeriodEnd: false,
    });

    await this.billingRepository.upsertSubscriptionByUserId(
      buildSubscriptionUpsertInput({
        userId: input.userId,
        subscription,
        overrides: {
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
      }),
    );
    this.invalidateSubscriptionCache(input.userId);
  }

  async handleWebhook(input: WebhookInput): Promise<StripeWebhookEvent> {
    const event = await this.stripeRepository.constructWebhookEvent({
      payload: input.payload,
      signature: input.signature,
    });

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = parseStripeSubscriptionWebhook(
          event.data.object as StripeSubscriptionWebhookObject,
        );

        if (!subscription.userId || !subscription.stripeCustomerId) {
          logger.warn('billing_webhook_subscription_missing_link', {
            eventId: event.id,
            eventType: event.type,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            hasUserId: Boolean(subscription.userId),
            hasStripeCustomerId: Boolean(subscription.stripeCustomerId),
          });
          await this.billingRepository.recordStripeEventIfFirst({
            stripeEventId: event.id,
            type: event.type,
            payload: event as unknown as Record<string, unknown>,
          });
          break;
        }

        await this.billingRepository.upsertSubscriptionByStripeEvent({
          stripeEventId: event.id,
          eventCreatedAt: new Date(event.created * 1000),
          type: event.type,
          payload: event as unknown as Record<string, unknown>,
          userId: subscription.userId,
          stripeCustomerId: subscription.stripeCustomerId,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          status: subscription.status,
          stripePriceId: subscription.stripePriceId,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          canceledAt: subscription.canceledAt,
          endedAt: subscription.endedAt,
        });
        this.invalidateSubscriptionCache(subscription.userId);
        break;
      }
      default: {
        await this.billingRepository.recordStripeEventIfFirst({
          stripeEventId: event.id,
          type: event.type,
          payload: event as unknown as Record<string, unknown>,
        });
        break;
      }
    }

    return event;
  }

  private getCachedSubscription(userId: string): Promise<Subscription | null> {
    return this.billingCache.getSubscription(userId, () =>
      this.billingRepository.findSubscriptionByUserId(userId),
    );
  }

  private getCachedPlanById(planId: string): Promise<Plan | null> {
    return this.billingCache.getPlanById(planId, () => this.billingRepository.findPlanById(planId));
  }

  private getCachedPlanByKey(planKey: PlanKey): Promise<Plan | null> {
    return this.billingCache.getPlanByKey(planKey, () =>
      this.billingRepository.findPlanByKey(planKey),
    );
  }

  private async resolveEffectivePlanKey(subscription: Subscription | null): Promise<PlanKey> {
    if (!isActiveSubscriptionStatus(subscription?.status)) {
      return 'free';
    }
    if (!subscription?.planId) {
      return 'free';
    }
    const plan = await this.getCachedPlanById(subscription.planId);
    return plan?.key ?? 'free';
  }

  private getCachedPlanCreditAllowance(planKey: PlanKey): Promise<PlanCreditAllowance | null> {
    return this.billingCache.getPlanCreditAllowance(planKey, () =>
      this.billingRepository.findPlanCreditAllowance(planKey),
    );
  }

  private async ensureMonthlyCreditGrant(params: {
    userId: string;
    periodStart: Date;
    periodEnd: Date;
    monthlyCredits: number;
  }): Promise<void> {
    const granted = await this.billingRepository.sumCreditAmountByUserInPeriod({
      userId: params.userId,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      reason: 'monthly_grant',
    });
    const grantDelta = params.monthlyCredits - granted;
    if (grantDelta <= 0) {
      return;
    }

    const periodKey = params.periodStart.toISOString().slice(0, 10);
    await this.billingRepository.createCreditLedgerEntryIfFirst({
      userId: params.userId,
      amount: grantDelta,
      reason: 'monthly_grant',
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      idempotencyKey: `monthly_grant:${params.userId}:${periodKey}:${params.monthlyCredits}`,
    });
  }

  private invalidateSubscriptionCache(userId: string) {
    this.billingCache.invalidateSubscription(userId);
  }
}
