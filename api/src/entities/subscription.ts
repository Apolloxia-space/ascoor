import type {
  CancellationReason as PrismaCancellationReason,
  Plan as PrismaPlan,
  Subscription as PrismaSubscription,
  SubscriptionStatus as PrismaSubscriptionStatus,
} from '../generated/prisma/client';

export type Plan = PrismaPlan;
export type Subscription = PrismaSubscription;
export type SubscriptionStatus = PrismaSubscriptionStatus;
export type CancellationReason = PrismaCancellationReason;

export const CANCEL_SUBSCRIPTION_REASONS = [
  'pricing',
  'features',
  'complex',
  'switch',
  'other',
] as const;

export type CancelSubscriptionReason = (typeof CANCEL_SUBSCRIPTION_REASONS)[number];
