import type { AiAssetPackRepository } from '../repositories/ai/assetPack.repository';
import type { PromptCompilerRepository } from '../repositories/ai/prompt-compiler.repository';
import type { IGcsRepository, IAssetPackRepository } from '../repositories/interfaces';
import type { WorkspaceRepository } from '../repositories/postgres/workspace.repository';
import type {
  AssetPackListCursor,
  PackGenerationJobRepositoryPostgres,
} from '../repositories/postgres/assetPack-job.repository';
import type { BillingRepository } from '../repositories/postgres/billing.repository';
import type { AssetPackTaskQueue } from '../infra/assetPack-task-queue';
import type { PackGenerationStatus, PlanKey, Subscription } from '../generated/prisma/client';
import {
  AssetPackConcurrencyLimitExceededError,
  AssetPackQuotaExceededError,
  AssetPackValidationError,
  NotFoundError,
} from './errors';
import {
  AssetPackPipelineError,
  AssetPackPipelineService,
  type AssetPackTraceContext,
} from '../services/assetPacks/assetPack-pipeline.service';
import { inferAssetPackErrorCode } from '../services/assetPacks/assetPack-error-code.policy';
import { BillingCache } from '../repositories/inmemory/billing.cache';
import { logger } from '../utils/logger';
import { getUtcMonthWindow } from '../utils/date';
import { normalizeRequiredFormValue } from '../utils/form';
import { isActiveSubscriptionStatus } from '../utils/subscription';
import { collapseWhitespace, truncateText } from '../utils/text';
import { CREATE_FORM_MAX_CHARS } from '../constants/form-limits';

const DEFAULT_FAILURE_TITLE = 'Pack generation failed';
const DEFAULT_UNEXPECTED_FAILURE_MESSAGE = 'Pack generation failed.';
const DEFAULT_USER_FACING_FAILURE_MESSAGE = 'Something went wrong. Please try again.';
const DEFAULT_RUNNING_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_RUNNING_TIMEOUT_MESSAGE = 'Pack generation timed out while processing.';
const DEFAULT_QUEUED_TIMEOUT_MESSAGE = 'Pack generation timed out while waiting in queue.';
const DEFAULT_STALE_REAP_BATCH_LIMIT = 100;
const MAX_STALE_REAP_BATCH_LIMIT = 500;
const DEFAULT_LIST_PACK_GENERATION_JOBS_LIMIT = 30;
const ERROR_CODE_MESSAGES: Record<string, string> = {
  AI_AGENT_TIMEOUT: DEFAULT_USER_FACING_FAILURE_MESSAGE,
  PACK_GENERATION_JOB_NOT_FOUND: DEFAULT_USER_FACING_FAILURE_MESSAGE,
  TASK_ENQUEUE_FAILED: DEFAULT_USER_FACING_FAILURE_MESSAGE,
};
const ERROR_STAGE_MESSAGES: Record<string, string> = {
  AI_AGENT_INVOKE: DEFAULT_USER_FACING_FAILURE_MESSAGE,
  API_GET_PACK_GENERATION_JOB: DEFAULT_USER_FACING_FAILURE_MESSAGE,
  PROMPT_COMPILE: DEFAULT_USER_FACING_FAILURE_MESSAGE,
};
const ASSET_COUNT_PROMPT_PATTERN = /^Asset count:\s*generate\s+(\d+)\s+separate reusable assets\./m;

type PackGenerationJobListItem = {
  packGenerationJobId: string;
  status: string;
  userPrompt: string | null;
  message: string | null;
  title: string | null;
  assetPackId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  promptPreview: string;
};

type PackGenerationJobResponse = {
  packGenerationJobId: string;
  status: string;
  userPrompt: string | null;
  message: string | null;
  title: string | null;
  assetPackId: string | null;
  errorMessage: string | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
};

type EnqueueAssetPackInput = {
  workspaceId: string;
  userPrompt: string;
  userId: string;
};

type ListByWorkspaceQueryInput = {
  userId: string;
  workspaceId: string;
  statuses?: Array<PackGenerationStatus>;
  limit?: number;
  cursor?: string | null;
};

type ListByWorkspaceResult = {
  workspaceId: string;
  items: Array<PackGenerationJobListItem>;
  nextCursor: string | null;
};

type ReapStaleRunningResult = {
  scannedRunning: number;
  scannedQueued: number;
  reapedRunning: number;
  reapedQueued: number;
  reaped: number;
  runningStaleBefore: string;
  queuedStaleBefore: string;
  runningTimeoutMs: number;
  queuedTimeoutMs: number;
  limit: number;
};

export type AssetPacksExecuteCommand =
  | {
      type: 'enqueue';
      input: EnqueueAssetPackInput;
      traceContext?: AssetPackTraceContext;
    }
  | {
      type: 'process';
      packGenerationJobId: string;
      traceContext?: AssetPackTraceContext;
    };

export type AssetPacksQuery =
  | {
      type: 'get';
      userId: string;
      packGenerationJobId: string;
    }
  | {
      type: 'listByWorkspace';
      input: ListByWorkspaceQueryInput;
    };

export type AssetPacksMaintenanceCommand = {
  type: 'reapStaleRunning';
  limit?: number;
};

function buildUserFacingErrorMessage(input: {
  errorMessage?: string | null;
  errorCode?: string | null;
  errorStage?: string | null;
}): string | null {
  const code = (input.errorCode ?? '').trim();
  if (code && ERROR_CODE_MESSAGES[code]) {
    return ERROR_CODE_MESSAGES[code];
  }

  const stage = (input.errorStage ?? '').trim();
  if (stage && ERROR_STAGE_MESSAGES[stage]) {
    return ERROR_STAGE_MESSAGES[stage];
  }

  const message = (input.errorMessage ?? '').trim();
  if (!message) {
    return null;
  }
  return DEFAULT_USER_FACING_FAILURE_MESSAGE;
}

function estimateRequiredCredits(userPrompt: string): number {
  const match = userPrompt.match(ASSET_COUNT_PROMPT_PATTERN);
  const parsed = match ? Number.parseInt(match[1] ?? '', 10) : 1;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
}

export class PackGenerationJobsUsecase {
  private readonly billingCache = new BillingCache();
  private readonly pipelineService: AssetPackPipelineService;
  private readonly taskQueue?: AssetPackTaskQueue;

  constructor(
    aiRepository: AiAssetPackRepository,
    private readonly assetPackRepository: IAssetPackRepository,
    private readonly workspaceRepository: WorkspaceRepository,
    gcsRepository: IGcsRepository,
    private readonly packGenerationJobRepository: PackGenerationJobRepositoryPostgres,
    private readonly billingRepository: BillingRepository,
    taskQueue?: AssetPackTaskQueue,
    promptCompilerRepository?: PromptCompilerRepository,
    pipelineService?: AssetPackPipelineService,
  ) {
    this.taskQueue = taskQueue;
    this.pipelineService =
      pipelineService ??
      new AssetPackPipelineService({
        aiRepository,
        assetPackRepository: this.assetPackRepository,
        workspaceRepository: this.workspaceRepository,
        gcsRepository,
        packGenerationJobRepository: this.packGenerationJobRepository,
        billingRepository: this.billingRepository,
        promptCompilerRepository,
      });
  }

  async execute(command: {
    type: 'enqueue';
    input: EnqueueAssetPackInput;
    traceContext?: AssetPackTraceContext;
  }): Promise<PackGenerationJobResponse>;
  async execute(command: {
    type: 'process';
    packGenerationJobId: string;
    traceContext?: AssetPackTraceContext;
  }): Promise<undefined>;
  async execute(command: AssetPacksExecuteCommand): Promise<PackGenerationJobResponse | undefined> {
    switch (command.type) {
      case 'enqueue':
        return this.executeEnqueue(command.input, command.traceContext ?? {});
      case 'process':
        await this.executeProcess(command.packGenerationJobId, command.traceContext ?? {});
        return undefined;
    }
  }

  async query(command: {
    type: 'get';
    userId: string;
    packGenerationJobId: string;
  }): Promise<PackGenerationJobResponse>;
  async query(command: {
    type: 'listByWorkspace';
    input: ListByWorkspaceQueryInput;
  }): Promise<ListByWorkspaceResult>;
  async query(command: AssetPacksQuery): Promise<PackGenerationJobResponse | ListByWorkspaceResult> {
    switch (command.type) {
      case 'get':
        return this.queryGet(command.userId, command.packGenerationJobId);
      case 'listByWorkspace':
        return this.queryListByWorkspace(command.input);
    }
  }

  async maintenance(command: {
    type: 'reapStaleRunning';
    limit?: number;
  }): Promise<ReapStaleRunningResult>;
  async maintenance(command: AssetPacksMaintenanceCommand): Promise<ReapStaleRunningResult> {
    switch (command.type) {
      case 'reapStaleRunning':
        return this.maintenanceReapStaleRunning(command.limit);
    }
  }

  private async executeEnqueue(input: EnqueueAssetPackInput, traceContext: AssetPackTraceContext = {}) {
    const userPrompt = normalizeRequiredFormValue(input.userPrompt, {
      field: 'userPrompt',
      maxChars: CREATE_FORM_MAX_CHARS,
      errorFactory: (message) => new AssetPackValidationError(message),
    });
    const workspace = await this.workspaceRepository.getOwned(input.workspaceId, input.userId);
    if (!workspace) {
      throw new NotFoundError('workspace not found');
    }

    const usage = await this.resolveCreditUsage(input.userId);
    const requiredCredits = estimateRequiredCredits(userPrompt);
    if (usage.balance < requiredCredits) {
      throw new AssetPackQuotaExceededError();
    }
    const concurrentLimit = await this.resolveConcurrentLimit(usage.planKey);
    const active = await this.packGenerationJobRepository.countActiveByUser(input.userId);
    if (active >= concurrentLimit) {
      throw new AssetPackConcurrencyLimitExceededError();
    }
    const job = await this.packGenerationJobRepository.create({
      workspaceId: input.workspaceId,
      userId: input.userId,
      userPrompt,
    });

    await this.dispatchOrRun(job, traceContext);

    return this.toResponse(job);
  }

  private async queryGet(userId: string, packGenerationJobId: string) {
    const job = await this.packGenerationJobRepository.getOwned(userId, packGenerationJobId);
    if (!job) {
      throw new NotFoundError('pack generation job not found');
    }
    return this.toResponse(job);
  }

  private async queryListByWorkspace(input: ListByWorkspaceQueryInput): Promise<ListByWorkspaceResult> {
    const workspace = await this.workspaceRepository.getOwned(input.workspaceId, input.userId);
    if (!workspace) {
      throw new NotFoundError('workspace not found');
    }

    const statuses = input.statuses;
    const limit = input.limit ?? DEFAULT_LIST_PACK_GENERATION_JOBS_LIMIT;
    const cursor = this.decodeListCursor(input.cursor);

    const listed = await this.packGenerationJobRepository.listByWorkspaceOwned({
      userId: input.userId,
      workspaceId: input.workspaceId,
      statuses,
      limit,
      cursor,
    });

    const items = listed.items.map((job) => ({
      ...this.toResponse(job),
      workspaceId: job.workspaceId,
      promptPreview: this.toPromptPreview(job.userPrompt),
    }));

    const tail = listed.items.at(-1);
    return {
      workspaceId: input.workspaceId,
      items,
      nextCursor:
        listed.hasMore && tail
          ? this.encodeListCursor({ id: tail.id, createdAt: tail.createdAt })
          : null,
    };
  }

  private async executeProcess(packGenerationJobId: string, traceContext: AssetPackTraceContext = {}) {
    const requestId = traceContext.requestId ?? null;
    const traceId = traceContext.traceId ?? requestId ?? packGenerationJobId;

    const claimed = await this.packGenerationJobRepository.markRunning(packGenerationJobId);
    if (!claimed) {
      const existing = await this.packGenerationJobRepository.get(packGenerationJobId);
      if (!existing) {
        throw new NotFoundError('pack generation job not found');
      }
      return;
    }

    const job = await this.packGenerationJobRepository.get(packGenerationJobId);
    if (!job) {
      return;
    }

    const trace: AssetPackTraceContext = {
      requestId,
      traceId,
      packGenerationJobId: job.id,
    };

    try {
      await this.resolveCreditUsage(job.userId);
      const result = await this.pipelineService.run(
        {
          packGenerationJobId: job.id,
          workspaceId: job.workspaceId,
          userPrompt: job.userPrompt,
          userId: job.userId,
        },
        trace,
      );

      const marked = await this.packGenerationJobRepository.markSucceededIfRunning({
        id: job.id,
        message: result.message,
        title: result.title,
        assetPackId: result.assetPackId ?? null,
      });
      if (!marked) {
        return;
      }
    } catch (error) {
      const failureMessage =
        error instanceof AssetPackValidationError ? error.message : DEFAULT_UNEXPECTED_FAILURE_MESSAGE;
      const failedStage = error instanceof AssetPackPipelineError ? error.stage : 'PACK_GENERATION_FINALIZE';
      const errorCode =
        error instanceof AssetPackPipelineError
          ? error.errorCode
          : this.inferErrorCode(error, 'PACK_GENERATION_FINALIZE_FAILED');
      const marked = await this.packGenerationJobRepository.markFailedIfRunning({
        id: job.id,
        errorMessage: failureMessage,
        errorStage: failedStage,
        errorCode,
        message: failureMessage,
        title: DEFAULT_FAILURE_TITLE,
        assetPackId: error instanceof AssetPackPipelineError ? (error.assetPackId ?? undefined) : undefined,
      });
      if (!marked) {
        return;
      }
      logger.info('assetPack_trace_summary', {
        pack_generation_job_id: trace.packGenerationJobId,
        trace_id: trace.traceId,
        request_id: trace.requestId,
        final_status: 'failed',
        failed_stage: failedStage,
        error_code: errorCode,
      });
    }
  }

  private async maintenanceReapStaleRunning(limit?: number): Promise<ReapStaleRunningResult> {
    const runningTimeoutMs =
      Number(process.env.PACK_GENERATION_RUNNING_TIMEOUT_MS) || DEFAULT_RUNNING_TIMEOUT_MS;
    const queuedTimeoutMs = Number(process.env.PACK_GENERATION_QUEUED_TIMEOUT_MS) || runningTimeoutMs;
    const runningStaleBefore = new Date(Date.now() - runningTimeoutMs);
    const queuedStaleBefore = new Date(Date.now() - queuedTimeoutMs);
    const envLimit =
      Number(process.env.PACK_GENERATION_STALE_REAP_BATCH_LIMIT) || DEFAULT_STALE_REAP_BATCH_LIMIT;
    const requested =
      typeof limit === 'number' && Number.isFinite(limit) ? Math.floor(limit) : envLimit;
    const batchLimit = requested <= 0 ? envLimit : Math.min(requested, MAX_STALE_REAP_BATCH_LIMIT);
    const staleRunningJobs = await this.packGenerationJobRepository.listRunningStale({
      staleBefore: runningStaleBefore,
      limit: batchLimit,
    });
    const staleQueuedJobs = await this.packGenerationJobRepository.listQueuedStale({
      staleBefore: queuedStaleBefore,
      limit: batchLimit,
    });

    let reapedRunning = 0;
    for (const job of staleRunningJobs) {
      const recovered = await this.packGenerationJobRepository.markFailedIfRunningStale({
        id: job.id,
        staleBefore: runningStaleBefore,
        errorMessage: DEFAULT_RUNNING_TIMEOUT_MESSAGE,
        errorStage: 'PACK_GENERATION_FINALIZE',
        errorCode: 'PACK_GENERATION_TIMEOUT_RUNNING',
        message: DEFAULT_RUNNING_TIMEOUT_MESSAGE,
        title: DEFAULT_FAILURE_TITLE,
      });
      if (!recovered) {
        continue;
      }

      reapedRunning += 1;
      logger.info('assetPack_trace_summary', {
        pack_generation_job_id: job.id,
        trace_id: job.id,
        request_id: null,
        final_status: 'failed',
        failed_stage: 'PACK_GENERATION_FINALIZE',
        error_code: 'PACK_GENERATION_TIMEOUT_RUNNING',
      });
    }

    let reapedQueued = 0;
    for (const job of staleQueuedJobs) {
      const recovered = await this.packGenerationJobRepository.markFailedIfQueuedStale({
        id: job.id,
        staleBefore: queuedStaleBefore,
        errorMessage: DEFAULT_QUEUED_TIMEOUT_MESSAGE,
        errorStage: 'API_TASK_ENQUEUE',
        errorCode: 'PACK_GENERATION_TIMEOUT_QUEUED',
        message: DEFAULT_QUEUED_TIMEOUT_MESSAGE,
        title: DEFAULT_FAILURE_TITLE,
      });
      if (!recovered) {
        continue;
      }

      reapedQueued += 1;
      logger.info('assetPack_trace_summary', {
        pack_generation_job_id: job.id,
        trace_id: job.id,
        request_id: null,
        final_status: 'failed',
        failed_stage: 'API_TASK_ENQUEUE',
        error_code: 'PACK_GENERATION_TIMEOUT_QUEUED',
      });
    }

    return {
      scannedRunning: staleRunningJobs.length,
      scannedQueued: staleQueuedJobs.length,
      reapedRunning,
      reapedQueued,
      reaped: reapedRunning + reapedQueued,
      runningStaleBefore: runningStaleBefore.toISOString(),
      queuedStaleBefore: queuedStaleBefore.toISOString(),
      runningTimeoutMs,
      queuedTimeoutMs,
      limit: batchLimit,
    };
  }

  private async dispatchOrRun(
    job: {
      id: string;
    },
    traceContext: AssetPackTraceContext,
  ) {
    const requestId = traceContext.requestId ?? null;
    const traceId = traceContext.traceId ?? requestId ?? job.id;

    if (!this.taskQueue || !this.taskQueue.isEnabled()) {
      void this.executeProcess(job.id, {
        requestId,
        traceId,
        packGenerationJobId: job.id,
      }).catch(() => {});
      return;
    }

    try {
      await this.taskQueue.enqueue(job.id, {
        traceId,
        originRequestId: requestId,
      });
    } catch (error) {
      const message = (error as Error)?.message ?? String(error);
      await this.packGenerationJobRepository.markFailed({
        id: job.id,
        errorMessage: `Failed to enqueue pack generation task: ${message}`,
        errorStage: 'API_TASK_ENQUEUE',
        errorCode: 'TASK_ENQUEUE_FAILED',
        message: DEFAULT_UNEXPECTED_FAILURE_MESSAGE,
        title: DEFAULT_FAILURE_TITLE,
      });
      logger.info('assetPack_trace_summary', {
        pack_generation_job_id: job.id,
        trace_id: traceId,
        request_id: requestId,
        final_status: 'failed',
        failed_stage: 'API_TASK_ENQUEUE',
        error_code: 'TASK_ENQUEUE_FAILED',
      });
    }
  }

  private async resolveCreditUsage(userId: string): Promise<{
    periodStart: Date;
    periodEnd: Date;
    balance: number;
    monthlyCredits: number;
    planKey: PlanKey;
  }> {
    const subscription = await this.billingCache.getSubscription(userId, () =>
      this.billingRepository.findSubscriptionByUserId(userId),
    );
    const planKey = await this.resolveEffectivePlanKey(subscription);

    const now = new Date();
    const { start: periodStart, end: periodEnd } = getUtcMonthWindow(now);
    const allowance = await this.resolveCreditAllowance(planKey);
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
      periodStart,
      periodEnd,
      balance,
      monthlyCredits: allowance.monthlyCredits,
      planKey,
    };
  }

  private async resolveEffectivePlanKey(subscription: Subscription | null): Promise<PlanKey> {
    if (!isActiveSubscriptionStatus(subscription?.status)) {
      return 'free';
    }
    if (!subscription?.planId) {
      return 'free';
    }
    const planId = subscription.planId;
    const plan = await this.billingCache.getPlanById(subscription.planId, () =>
      this.billingRepository.findPlanById(planId),
    );
    return plan?.key ?? 'free';
  }

  private async resolveCreditAllowance(planKey: PlanKey): Promise<{
    monthlyCredits: number;
    concurrentPackGenerationLimit: number;
  }> {
    try {
      const record = await this.billingCache.getPlanCreditAllowance(planKey, () =>
        this.billingRepository.findPlanCreditAllowance(planKey),
      );
      const monthlyCredits = record?.monthlyCredits ?? null;
      const concurrentPackGenerationLimit = record?.concurrentPackGenerationLimit ?? null;
      if (
        monthlyCredits &&
        Number.isFinite(monthlyCredits) &&
        monthlyCredits > 0 &&
        concurrentPackGenerationLimit &&
        Number.isFinite(concurrentPackGenerationLimit) &&
        concurrentPackGenerationLimit > 0
      ) {
        return {
          monthlyCredits,
          concurrentPackGenerationLimit,
        };
      }
    } catch {}
    throw new Error(`plan_credit_allowance_missing:${planKey}`);
  }

  private async resolveConcurrentLimit(planKey: PlanKey): Promise<number> {
    return (await this.resolveCreditAllowance(planKey)).concurrentPackGenerationLimit;
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

  private toResponse(job: {
    id: string;
    status: string;
    userPrompt?: string | null;
    compiledPrompt?: string | null;
    message?: string | null;
    title?: string | null;
    assetPackId?: string | null;
    errorMessage?: string | null;
    errorStage?: string | null;
    errorCode?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      packGenerationJobId: job.id,
      status: job.status,
      userPrompt: job.userPrompt ?? null,
      message: job.message ?? null,
      title: job.title ?? null,
      assetPackId: job.assetPackId ?? null,
      errorMessage: buildUserFacingErrorMessage({
        errorMessage: job.errorMessage ?? null,
        errorCode: job.errorCode ?? null,
        errorStage: job.errorStage ?? null,
      }),
      errorCode: job.errorCode ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }

  private toPromptPreview(userPrompt: string) {
    const normalized = collapseWhitespace(userPrompt);
    if (!normalized) return 'AssetPack request';
    return truncateText(normalized, 80, '...');
  }

  private decodeListCursor(cursor?: string | null): AssetPackListCursor | null {
    if (!cursor) return null;
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as { id?: string; createdAt?: string } | null;
      if (!parsed?.id || !parsed.createdAt) {
        throw new Error('missing_fields');
      }
      const createdAt = new Date(parsed.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        throw new Error('invalid_date');
      }
      return {
        id: parsed.id,
        createdAt,
      };
    } catch {
      throw new AssetPackValidationError('invalid cursor');
    }
  }

  private encodeListCursor(cursor: AssetPackListCursor): string {
    return Buffer.from(
      JSON.stringify({
        id: cursor.id,
        createdAt: cursor.createdAt.toISOString(),
      }),
      'utf8',
    ).toString('base64url');
  }

  private inferErrorCode(error: unknown, fallback: string): string {
    return inferAssetPackErrorCode(error, fallback);
  }
}
