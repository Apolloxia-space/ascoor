import type { Plan, SubscriptionStatus } from './subscription';
export type { Plan, Subscription, SubscriptionStatus } from './subscription';

export type BillingStatus = {
  status: SubscriptionStatus | 'none';
  plan: Plan | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

export type BillingUsage = {
  used: number;
  limit: number;
  periodStart: Date;
  periodEnd: Date;
};
