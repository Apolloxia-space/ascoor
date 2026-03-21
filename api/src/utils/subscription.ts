import type { Subscription, SubscriptionStatus } from '../entities/subscription';

const PRO_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>(['active', 'trialing']);
const STRIPE_MANAGED_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  'incomplete',
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'paused',
]);

export type StripeSubscriptionWebhookObject = {
  id: string;
  status: string;
  customer: string | { id?: string | null } | null;
  current_period_start?: number | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
  canceled_at?: number | null;
  ended_at?: number | null;
  metadata?: { userId?: string | null } | null;
  items?: {
    data?: Array<{
      price?: { id?: string | null } | null;
      current_period_start?: number | null;
      current_period_end?: number | null;
    }> | null;
  } | null;
};

export type ParsedStripeSubscriptionWebhook = {
  stripeSubscriptionId: string;
  stripeCustomerId: string | null;
  userId: string | null;
  status: SubscriptionStatus;
  stripePriceId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  endedAt: Date | null;
};

type SubscriptionUpsertInput = {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  planId?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date | null;
  endedAt?: Date | null;
};

type SubscriptionUpsertOverrides = Partial<
  Pick<
    SubscriptionUpsertInput,
    | 'status'
    | 'planId'
    | 'currentPeriodStart'
    | 'currentPeriodEnd'
    | 'cancelAtPeriodEnd'
    | 'canceledAt'
    | 'endedAt'
  >
>;

function fromUnixSeconds(value?: number | null): Date | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return new Date(value * 1000);
}

function trimToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function isProSubscriptionStatus(status: SubscriptionStatus | null | undefined): boolean {
  if (!status) {
    return false;
  }
  return PRO_SUBSCRIPTION_STATUSES.has(status);
}

export function isStripeManagedSubscriptionStatus(
  status: SubscriptionStatus | null | undefined,
): boolean {
  if (!status) {
    return false;
  }
  return STRIPE_MANAGED_SUBSCRIPTION_STATUSES.has(status);
}

export function parseStripeSubscriptionWebhook(
  subscription: StripeSubscriptionWebhookObject,
): ParsedStripeSubscriptionWebhook {
  const firstItem = subscription.items?.data?.[0];
  const stripeCustomerId =
    typeof subscription.customer === 'string'
      ? trimToNull(subscription.customer)
      : trimToNull(subscription.customer?.id ?? null);

  const currentPeriodStart =
    fromUnixSeconds(subscription.current_period_start) ??
    fromUnixSeconds(firstItem?.current_period_start);
  const currentPeriodEnd =
    fromUnixSeconds(subscription.current_period_end) ??
    fromUnixSeconds(firstItem?.current_period_end);

  return {
    stripeSubscriptionId: subscription.id,
    stripeCustomerId,
    userId: trimToNull(subscription.metadata?.userId ?? null),
    status: subscription.status as SubscriptionStatus,
    stripePriceId: trimToNull(firstItem?.price?.id ?? null),
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    canceledAt: fromUnixSeconds(subscription.canceled_at),
    endedAt: fromUnixSeconds(subscription.ended_at),
  };
}

export function buildSubscriptionUpsertInput(params: {
  userId: string;
  subscription: Subscription;
  overrides?: SubscriptionUpsertOverrides;
}): SubscriptionUpsertInput {
  return {
    userId: params.userId,
    stripeCustomerId: params.subscription.stripeCustomerId,
    stripeSubscriptionId: params.subscription.stripeSubscriptionId,
    status: params.subscription.status,
    planId: params.subscription.planId,
    currentPeriodStart: params.subscription.currentPeriodStart,
    currentPeriodEnd: params.subscription.currentPeriodEnd,
    cancelAtPeriodEnd: params.subscription.cancelAtPeriodEnd,
    canceledAt: params.subscription.canceledAt,
    endedAt: params.subscription.endedAt,
    ...params.overrides,
  };
}
