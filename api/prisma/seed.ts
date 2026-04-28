import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

type PlanSeed = {
  key: 'free' | 'hobby' | 'pro';
  name: string;
  stripePriceId?: string | null;
  amount: number;
  currency?: string;
  interval: 'month' | 'year';
  intervalCount?: number;
  isActive?: boolean;
};

type PlanLimitSeed = {
  planKey: 'free' | 'hobby' | 'pro';
  monthlyCredits: number;
  concurrentPackGenerationLimit: number;
};

const PLAN_KEYS = new Set(['free', 'hobby', 'pro']);

const datasourceUrl = process.env.DATABASE_URL;
if (!datasourceUrl) {
  throw new Error('DATABASE_URL is required for seeding.');
}
const adapter = new PrismaPg({ connectionString: datasourceUrl });
const prisma = new PrismaClient({ adapter });

function resolveEnv(): 'dev' | 'prod' {
  const raw = (process.env.GCP_ENV ?? '').toLowerCase();
  if (raw === 'dev' || raw === 'prod') return raw;
  throw new Error('GCP_ENV must be set to "dev" or "prod" for seeding.');
}

function toSeedPath(env: 'dev' | 'prod'): string {
  const baseDir = fileURLToPath(new URL('.', import.meta.url));
  return path.join(baseDir, 'seeds', `plan.${env}.json`);
}

function toPlanLimitSeedPath(env: 'dev' | 'prod'): string {
  const baseDir = fileURLToPath(new URL('.', import.meta.url));
  return path.join(baseDir, 'seeds', `plan-limits.${env}.json`);
}

function assertPlanSeed(value: unknown, index: number): asserts value is PlanSeed {
  if (!value || typeof value !== 'object') {
    throw new Error(`Invalid plan seed at index ${index}: expected object.`);
  }

  const plan = value as Record<string, unknown>;
  if (typeof plan.key !== 'string' || !PLAN_KEYS.has(plan.key)) {
    throw new Error(`Invalid plan seed at index ${index}: key must be free, hobby, or pro.`);
  }
  if (typeof plan.name !== 'string' || plan.name.trim().length === 0) {
    throw new Error(`Invalid plan seed at index ${index}: name is required.`);
  }
  if (
    plan.stripePriceId !== null &&
    plan.stripePriceId !== undefined &&
    (typeof plan.stripePriceId !== 'string' || plan.stripePriceId.trim().length === 0)
  ) {
    throw new Error(
      `Invalid plan seed at index ${index}: stripePriceId must be a non-empty string or null.`,
    );
  }
  if (typeof plan.amount !== 'number' || !Number.isFinite(plan.amount)) {
    throw new Error(`Invalid plan seed at index ${index}: amount must be a number.`);
  }
  if (plan.interval !== 'month' && plan.interval !== 'year') {
    throw new Error(`Invalid plan seed at index ${index}: interval must be "month" or "year".`);
  }
}

function assertPlanLimitSeed(value: unknown, index: number): asserts value is PlanLimitSeed {
  if (!value || typeof value !== 'object') {
    throw new Error(`Invalid plan limit seed at index ${index}: expected object.`);
  }

  const planLimit = value as Record<string, unknown>;
  if (typeof planLimit.planKey !== 'string' || !PLAN_KEYS.has(planLimit.planKey)) {
    throw new Error(
      `Invalid plan limit seed at index ${index}: planKey must be free, hobby, or pro.`,
    );
  }
  if (
    typeof planLimit.monthlyCredits !== 'number' ||
    !Number.isFinite(planLimit.monthlyCredits) ||
    planLimit.monthlyCredits <= 0
  ) {
    throw new Error(
      `Invalid plan limit seed at index ${index}: monthlyCredits must be a positive number.`,
    );
  }
  if (
    typeof planLimit.concurrentPackGenerationLimit !== 'number' ||
    !Number.isFinite(planLimit.concurrentPackGenerationLimit) ||
    planLimit.concurrentPackGenerationLimit <= 0
  ) {
    throw new Error(
      `Invalid plan limit seed at index ${index}: concurrentPackGenerationLimit must be a positive number.`,
    );
  }
}

async function loadPlans(env: 'dev' | 'prod'): Promise<Array<PlanSeed>> {
  const seedPath = toSeedPath(env);
  const raw = await readFile(seedPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Plan seed must be an array: ${seedPath}`);
  }
  parsed.forEach(assertPlanSeed);
  return parsed as Array<PlanSeed>;
}

async function loadPlanLimits(env: 'dev' | 'prod'): Promise<Array<PlanLimitSeed>> {
  const seedPath = toPlanLimitSeedPath(env);
  const raw = await readFile(seedPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Plan limit seed must be an array: ${seedPath}`);
  }
  parsed.forEach(assertPlanLimitSeed);
  return parsed as Array<PlanLimitSeed>;
}

async function main(): Promise<void> {
  const env = resolveEnv();
  const plans = await loadPlans(env);
  const planLimits = await loadPlanLimits(env);

  if (plans.length === 0) {
    console.warn(`No plans found in plan.${env}.json; nothing to seed.`);
    return;
  }

  await prisma.$transaction(
    plans.map((plan) =>
      prisma.plan.upsert({
        where: { key: plan.key },
        update: {
          key: plan.key,
          name: plan.name,
          stripePriceId: plan.stripePriceId?.trim() || null,
          amount: plan.amount,
          currency: plan.currency ?? 'usd',
          interval: plan.interval,
          intervalCount: plan.intervalCount ?? 1,
          isActive: plan.isActive ?? true,
        },
        create: {
          key: plan.key,
          name: plan.name,
          stripePriceId: plan.stripePriceId?.trim() || null,
          amount: plan.amount,
          currency: plan.currency ?? 'usd',
          interval: plan.interval,
          intervalCount: plan.intervalCount ?? 1,
          isActive: plan.isActive ?? true,
        },
      }),
    ),
  );

  await prisma.$transaction(
    planLimits.map((planLimit) =>
      prisma.planCreditAllowance.upsert({
        where: { planKey: planLimit.planKey },
        update: {
          monthlyCredits: planLimit.monthlyCredits,
          concurrentPackGenerationLimit: planLimit.concurrentPackGenerationLimit,
        },
        create: {
          planKey: planLimit.planKey,
          monthlyCredits: planLimit.monthlyCredits,
          concurrentPackGenerationLimit: planLimit.concurrentPackGenerationLimit,
        },
      }),
    ),
  );

  console.log(`Seeded ${plans.length} plan(s) and ${planLimits.length} plan limit(s) for ${env}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
