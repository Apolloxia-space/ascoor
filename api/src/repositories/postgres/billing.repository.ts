import { randomUUID } from 'node:crypto';

import type {
  CreditLedger,
  CreditLedgerReason,
  Plan,
  PlanCreditAllowance,
  PlanKey,
  Prisma,
  PrismaClient,
  StripeEvent,
  Subscription,
  SubscriptionStatus,
} from '../../generated/prisma/client';

export interface BillingRepository {
  findPlanById(id: string): Promise<Plan | null>;
  findPlanByPriceId(stripePriceId: string): Promise<Plan | null>;
  findPlanByKey(planKey: PlanKey): Promise<Plan | null>;
  findDefaultPlan(): Promise<Plan | null>;
  listActivePlans(): Promise<Array<Plan>>;
  findPlanCreditAllowance(planKey: PlanKey): Promise<PlanCreditAllowance | null>;
  sumCreditAmountByUserInPeriod(params: {
    userId: string;
    periodStart: Date;
    periodEnd: Date;
    reason?: CreditLedgerReason;
  }): Promise<number>;
  createCreditLedgerEntryIfFirst(params: {
    userId: string;
    amount: number;
    reason: CreditLedgerReason;
    idempotencyKey: string;
    periodStart?: Date | null;
    periodEnd?: Date | null;
    relatedDesignId?: string | null;
    relatedPartId?: string | null;
  }): Promise<boolean>;
  consumeCreditsIfAvailable(params: {
    userId: string;
    amount: number;
    reason: CreditLedgerReason;
    idempotencyKey: string;
    periodStart: Date;
    periodEnd: Date;
    relatedDesignId?: string | null;
    relatedPartId?: string | null;
  }): Promise<boolean>;
  findSubscriptionByUserId(userId: string): Promise<Subscription | null>;
  upsertSubscriptionByUserId(params: {
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
  }): Promise<Subscription>;
  hasStripeEvent(stripeEventId: string): Promise<boolean>;
  createStripeEvent(params: {
    stripeEventId: string;
    type: string;
    payload: Record<string, unknown>;
  }): Promise<StripeEvent>;
  recordStripeEventIfFirst(params: {
    stripeEventId: string;
    type: string;
    payload: Record<string, unknown>;
  }): Promise<boolean>;
  upsertSubscriptionByStripeEvent(params: {
    stripeEventId: string;
    eventCreatedAt: Date;
    type: string;
    payload: Record<string, unknown>;
    userId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    status: SubscriptionStatus;
    stripePriceId?: string | null;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: Date | null;
    endedAt?: Date | null;
  }): Promise<boolean>;
  createCancellationFeedback(params: {
    userId: string;
    subscriptionId: string;
    planId?: string | null;
    reason?: 'pricing' | 'features' | 'complex' | 'switch' | 'other' | null;
    details?: string | null;
    cancelAtPeriodEnd: boolean;
    status: SubscriptionStatus;
  }): Promise<void>;
}

export class BillingRepositoryPostgres implements BillingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findPlanById(id: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({ where: { id } });
  }

  findPlanByPriceId(stripePriceId: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({ where: { stripePriceId } });
  }

  findPlanByKey(planKey: PlanKey): Promise<Plan | null> {
    return this.prisma.plan.findUnique({ where: { key: planKey } });
  }

  findDefaultPlan(): Promise<Plan | null> {
    return this.prisma.plan.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  listActivePlans(): Promise<Array<Plan>> {
    return this.prisma.plan.findMany({ where: { isActive: true } });
  }

  findPlanCreditAllowance(planKey: PlanKey): Promise<PlanCreditAllowance | null> {
    return this.prisma.planCreditAllowance.findUnique({ where: { planKey } });
  }

  async sumCreditAmountByUserInPeriod(params: {
    userId: string;
    periodStart: Date;
    periodEnd: Date;
    reason?: CreditLedgerReason;
  }): Promise<number> {
    const result = await this.prisma.creditLedger.aggregate({
      where: {
        userId: params.userId,
        reason: params.reason,
        createdAt: {
          gte: params.periodStart,
          lt: params.periodEnd,
        },
      },
      _sum: {
        amount: true,
      },
    });
    return result._sum.amount ?? 0;
  }

  async createCreditLedgerEntryIfFirst(params: {
    userId: string;
    amount: number;
    reason: CreditLedgerReason;
    idempotencyKey: string;
    periodStart?: Date | null;
    periodEnd?: Date | null;
    relatedDesignId?: string | null;
    relatedPartId?: string | null;
  }): Promise<boolean> {
    const data: CreditLedger = {
      id: randomUUID(),
      userId: params.userId,
      amount: params.amount,
      reason: params.reason,
      periodStart: params.periodStart ?? null,
      periodEnd: params.periodEnd ?? null,
      relatedDesignId: params.relatedDesignId ?? null,
      relatedPartId: params.relatedPartId ?? null,
      idempotencyKey: params.idempotencyKey,
      createdAt: new Date(),
    };
    const inserted = await this.prisma.creditLedger.createMany({
      data: [data],
      skipDuplicates: true,
    });
    return inserted.count > 0;
  }

  async consumeCreditsIfAvailable(params: {
    userId: string;
    amount: number;
    reason: CreditLedgerReason;
    idempotencyKey: string;
    periodStart: Date;
    periodEnd: Date;
    relatedDesignId?: string | null;
    relatedPartId?: string | null;
  }): Promise<boolean> {
    if (!Number.isInteger(params.amount) || params.amount <= 0) {
      throw new Error('credit_consume_amount_must_be_positive');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.creditLedger.findUnique({
          where: { idempotencyKey: params.idempotencyKey },
        });
        if (existing) {
          return true;
        }

        const result = await tx.creditLedger.aggregate({
          where: {
            userId: params.userId,
            createdAt: {
              gte: params.periodStart,
              lt: params.periodEnd,
            },
          },
          _sum: {
            amount: true,
          },
        });
        const balance = result._sum.amount ?? 0;
        if (balance < params.amount) {
          return false;
        }

        await tx.creditLedger.create({
          data: {
            id: randomUUID(),
            userId: params.userId,
            amount: -params.amount,
            reason: params.reason,
            periodStart: params.periodStart,
            periodEnd: params.periodEnd,
            relatedDesignId: params.relatedDesignId ?? null,
            relatedPartId: params.relatedPartId ?? null,
            idempotencyKey: params.idempotencyKey,
          },
        });
        return true;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  findSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({ where: { userId } });
  }

  upsertSubscriptionByUserId(params: {
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
  }): Promise<Subscription> {
    return this.prisma.subscription.upsert({
      where: { userId: params.userId },
      update: {
        stripeCustomerId: params.stripeCustomerId,
        stripeSubscriptionId: params.stripeSubscriptionId,
        status: params.status,
        planId: params.planId ?? null,
        currentPeriodStart: params.currentPeriodStart ?? null,
        currentPeriodEnd: params.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
        canceledAt: params.canceledAt ?? null,
        endedAt: params.endedAt ?? null,
      },
      create: {
        userId: params.userId,
        stripeCustomerId: params.stripeCustomerId,
        stripeSubscriptionId: params.stripeSubscriptionId,
        status: params.status,
        planId: params.planId ?? null,
        currentPeriodStart: params.currentPeriodStart ?? null,
        currentPeriodEnd: params.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
        canceledAt: params.canceledAt ?? null,
        endedAt: params.endedAt ?? null,
      },
    });
  }

  async hasStripeEvent(stripeEventId: string): Promise<boolean> {
    const existing = await this.prisma.stripeEvent.findUnique({ where: { stripeEventId } });
    return Boolean(existing);
  }

  createStripeEvent(params: {
    stripeEventId: string;
    type: string;
    payload: Record<string, unknown>;
  }): Promise<StripeEvent> {
    return this.prisma.stripeEvent.create({
      data: {
        stripeEventId: params.stripeEventId,
        type: params.type,
        payload: params.payload as Prisma.InputJsonValue,
      },
    });
  }

  async recordStripeEventIfFirst(params: {
    stripeEventId: string;
    type: string;
    payload: Record<string, unknown>;
  }): Promise<boolean> {
    const inserted = await this.prisma.stripeEvent.createMany({
      data: [
        {
          id: randomUUID(),
          stripeEventId: params.stripeEventId,
          type: params.type,
          payload: params.payload as Prisma.InputJsonValue,
        },
      ],
      skipDuplicates: true,
    });
    return inserted.count > 0;
  }

  async upsertSubscriptionByStripeEvent(params: {
    stripeEventId: string;
    eventCreatedAt: Date;
    type: string;
    payload: Record<string, unknown>;
    userId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    status: SubscriptionStatus;
    stripePriceId?: string | null;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: Date | null;
    endedAt?: Date | null;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const inserted = await tx.stripeEvent.createMany({
        data: [
          {
            id: randomUUID(),
            stripeEventId: params.stripeEventId,
            type: params.type,
            payload: params.payload as Prisma.InputJsonValue,
          },
        ],
        skipDuplicates: true,
      });

      if (inserted.count === 0) {
        return false;
      }

      const user = await tx.user.findUnique({
        where: { id: params.userId },
        select: { id: true },
      });
      if (!user) {
        return true;
      }

      const plan = params.stripePriceId
        ? await tx.plan.findUnique({ where: { stripePriceId: params.stripePriceId } })
        : null;
      const planId = plan?.id ?? null;
      const currentPeriodStart = params.currentPeriodStart ?? null;
      const currentPeriodEnd = params.currentPeriodEnd ?? null;
      const cancelAtPeriodEnd = params.cancelAtPeriodEnd ?? false;
      const canceledAt = params.canceledAt ?? null;
      const endedAt = params.endedAt ?? null;
      const subscriptionId = randomUUID();

      await tx.$executeRaw`
        INSERT INTO "Subscription"
          ("id", "userId", "planId", "stripeCustomerId", "stripeSubscriptionId", "status", "currentPeriodStart", "currentPeriodEnd", "cancelAtPeriodEnd", "canceledAt", "endedAt", "lastStripeEventCreatedAt", "createdAt", "updatedAt")
        VALUES
          (${subscriptionId}, ${params.userId}, ${planId}, ${params.stripeCustomerId}, ${params.stripeSubscriptionId}, ${params.status}, ${currentPeriodStart}, ${currentPeriodEnd}, ${cancelAtPeriodEnd}, ${canceledAt}, ${endedAt}, ${params.eventCreatedAt}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("userId") DO UPDATE
        SET "planId" = EXCLUDED."planId",
            "stripeCustomerId" = EXCLUDED."stripeCustomerId",
            "stripeSubscriptionId" = EXCLUDED."stripeSubscriptionId",
            "status" = EXCLUDED."status",
            "currentPeriodStart" = EXCLUDED."currentPeriodStart",
            "currentPeriodEnd" = EXCLUDED."currentPeriodEnd",
            "cancelAtPeriodEnd" = EXCLUDED."cancelAtPeriodEnd",
            "canceledAt" = EXCLUDED."canceledAt",
            "endedAt" = EXCLUDED."endedAt",
            "lastStripeEventCreatedAt" = EXCLUDED."lastStripeEventCreatedAt",
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "Subscription"."lastStripeEventCreatedAt" IS NULL
           OR "Subscription"."lastStripeEventCreatedAt" < EXCLUDED."lastStripeEventCreatedAt"
      `;

      return true;
    });
  }

  async createCancellationFeedback(params: {
    userId: string;
    subscriptionId: string;
    planId?: string | null;
    reason?: 'pricing' | 'features' | 'complex' | 'switch' | 'other' | null;
    details?: string | null;
    cancelAtPeriodEnd: boolean;
    status: SubscriptionStatus;
  }): Promise<void> {
    const feedbackId = randomUUID();
    const planId = params.planId ?? null;
    const reason = params.reason ?? null;
    const details = params.details ?? null;

    await this.prisma.$executeRaw`
      INSERT INTO "SubscriptionCancellationFeedback"
        ("id", "userId", "subscriptionId", "planId", "reason", "details", "cancelAtPeriodEnd", "status", "createdAt")
      VALUES
        (${feedbackId}, ${params.userId}, ${params.subscriptionId}, ${planId}, ${reason}, ${details}, ${params.cancelAtPeriodEnd}, ${params.status}, CURRENT_TIMESTAMP)
    `;
  }
}
