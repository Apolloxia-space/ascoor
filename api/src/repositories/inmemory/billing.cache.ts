import type { Plan, PlanDesignLimit, Subscription } from '../../generated/prisma/client';
import { InMemoryAsyncCache } from './inmemory';

const DEFAULT_SUBSCRIPTION_CACHE_TTL_MS = 30 * 1000;
const DEFAULT_PLAN_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_LIMIT_CACHE_TTL_MS = 5 * 60 * 1000;

type BillingPlanKey = 'pro';

export class BillingCache {
  private readonly cache: InMemoryAsyncCache<string>;
  private readonly subscriptionCacheTtlMs: number;
  private readonly planCacheTtlMs: number;
  private readonly planLimitCacheTtlMs: number;

  constructor(options?: {
    max?: number;
    subscriptionCacheTtlMs?: number;
    planCacheTtlMs?: number;
    planLimitCacheTtlMs?: number;
  }) {
    this.cache = new InMemoryAsyncCache<string>({ max: options?.max ?? 1000 });
    this.subscriptionCacheTtlMs =
      options?.subscriptionCacheTtlMs ?? DEFAULT_SUBSCRIPTION_CACHE_TTL_MS;
    this.planCacheTtlMs = options?.planCacheTtlMs ?? DEFAULT_PLAN_CACHE_TTL_MS;
    this.planLimitCacheTtlMs = options?.planLimitCacheTtlMs ?? DEFAULT_LIMIT_CACHE_TTL_MS;
  }

  getSubscription(
    userId: string,
    loader: () => Promise<Subscription | null>,
  ): Promise<Subscription | null> {
    return this.cache.loadThrough(
      this.subscriptionCacheKey(userId),
      this.subscriptionCacheTtlMs,
      loader,
    );
  }

  getPlanById(planId: string, loader: () => Promise<Plan | null>): Promise<Plan | null> {
    return this.cache.loadThrough(`billing:plan:${planId}`, this.planCacheTtlMs, loader);
  }

  getDefaultPlan(loader: () => Promise<Plan | null>): Promise<Plan | null> {
    return this.cache.loadThrough('billing:plan:default', this.planCacheTtlMs, loader);
  }

  getPlanDesignLimit(
    planKey: BillingPlanKey,
    loader: () => Promise<PlanDesignLimit | null>,
  ): Promise<PlanDesignLimit | null> {
    return this.cache.loadThrough(`billing:limit:${planKey}`, this.planLimitCacheTtlMs, loader);
  }

  invalidateSubscription(userId: string): boolean {
    return this.cache.delete(this.subscriptionCacheKey(userId));
  }

  clear(): void {
    this.cache.clear();
  }

  private subscriptionCacheKey(userId: string): string {
    return `billing:subscription:${userId}`;
  }
}
