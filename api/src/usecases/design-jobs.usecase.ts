import type { AiDesignRepository } from '../repositories/ai/design.repository';
import type { PromptCompilerRepository } from '../repositories/ai/prompt-compiler.repository';
import type { IGcsRepository, IDesignRepository } from '../repositories/interfaces';
import type { ProjectRepository } from '../repositories/postgres/project.repository';
import type {
  DesignListCursor,
  DesignJobRepositoryPostgres,
} from '../repositories/postgres/design-job.repository';
import type { BillingRepository } from '../repositories/postgres/billing.repository';
import type { DesignTaskQueue } from '../infra/design-task-queue';
import type { DesignStatus, PlanKey, Subscription } from '../generated/prisma/client';
import {
  DesignConcurrencyLimitExceededError,
  DesignQuotaExceededError,
  DesignValidationError,
  NotFoundError,
} from './errors';
import {
  DesignPipelineError,
  DesignPipelineService,
  type DesignTraceContext,
} from '../services/designs/design-pipeline.service';
import { inferDesignErrorCode } from '../services/designs/design-error-code.policy';
import { BillingCache } from '../repositories/inmemory/billing.cache';
import { logger } from '../utils/logger';
import { getUtcMonthWindow } from '../utils/date';
import { normalizeRequiredFormValue } from '../utils/form';
import { isActiveSubscriptionStatus } from '../utils/subscription';
import { collapseWhitespace, truncateText } from '../utils/text';
import { CREATE_FORM_MAX_CHARS } from '../constants/form-limits';

const DEFAULT_FAILURE_TITLE = 'Design failed';
const DEFAULT_UNEXPECTED_FAILURE_MESSAGE = 'Design failed.';
const DEFAULT_USER_FACING_FAILURE_MESSAGE = 'Something went wrong. Please try again.';
const DEFAULT_RUNNING_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_RUNNING_TIMEOUT_MESSAGE = 'Design timed out while processing.';
const DEFAULT_QUEUED_TIMEOUT_MESSAGE = 'Design timed out while waiting in queue.';
const DEFAULT_STALE_REAP_BATCH_LIMIT = 100;
const MAX_STALE_REAP_BATCH_LIMIT = 500;
const DEFAULT_LIST_DESIGNS_LIMIT = 30;
const ERROR_CODE_MESSAGES: Record<string, string> = {
  AI_AGENT_TIMEOUT: DEFAULT_USER_FACING_FAILURE_MESSAGE,
  DESIGN_NOT_FOUND: DEFAULT_USER_FACING_FAILURE_MESSAGE,
  TASK_ENQUEUE_FAILED: DEFAULT_USER_FACING_FAILURE_MESSAGE,
};
const ERROR_STAGE_MESSAGES: Record<string, string> = {
  AI_AGENT_INVOKE: DEFAULT_USER_FACING_FAILURE_MESSAGE,
  API_GET_DESIGN: DEFAULT_USER_FACING_FAILURE_MESSAGE,
  PROMPT_COMPILE: DEFAULT_USER_FACING_FAILURE_MESSAGE,
};

type DesignJobListItem = {
  designJobId: string;
  status: string;
  userPrompt: string | null;
  message: string | null;
  title: string | null;
  designId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  promptPreview: string;
};

type DesignJobResponse = {
  designJobId: string;
  status: string;
  userPrompt: string | null;
  message: string | null;
  title: string | null;
  designId: string | null;
  errorMessage: string | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
};

type EnqueueDesignInput = {
  projectId: string;
  userPrompt: string;
  userId: string;
};

type ListByProjectQueryInput = {
  userId: string;
  projectId: string;
  statuses?: Array<DesignStatus>;
  limit?: number;
  cursor?: string | null;
};

type ListByProjectResult = {
  projectId: string;
  items: Array<DesignJobListItem>;
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

export type DesignsExecuteCommand =
  | {
      type: 'enqueue';
      input: EnqueueDesignInput;
      traceContext?: DesignTraceContext;
    }
  | {
      type: 'process';
      designJobId: string;
      traceContext?: DesignTraceContext;
    };

export type DesignsQuery =
  | {
      type: 'get';
      userId: string;
      designJobId: string;
    }
  | {
      type: 'listByProject';
      input: ListByProjectQueryInput;
    };

export type DesignsMaintenanceCommand = {
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

export class DesignJobsUsecase {
  private readonly billingCache = new BillingCache();
  private readonly pipelineService: DesignPipelineService;
  private readonly taskQueue?: DesignTaskQueue;

  constructor(
    aiRepository: AiDesignRepository,
    private readonly designRepository: IDesignRepository,
    private readonly projectRepository: ProjectRepository,
    gcsRepository: IGcsRepository,
    private readonly designJobRepository: DesignJobRepositoryPostgres,
    private readonly billingRepository: BillingRepository,
    taskQueue?: DesignTaskQueue,
    promptCompilerRepository?: PromptCompilerRepository,
    pipelineService?: DesignPipelineService,
  ) {
    this.taskQueue = taskQueue;
    this.pipelineService =
      pipelineService ??
      new DesignPipelineService({
        aiRepository,
        designRepository: this.designRepository,
        projectRepository: this.projectRepository,
        gcsRepository,
        designJobRepository: this.designJobRepository,
        promptCompilerRepository,
      });
  }

  async execute(command: {
    type: 'enqueue';
    input: EnqueueDesignInput;
    traceContext?: DesignTraceContext;
  }): Promise<DesignJobResponse>;
  async execute(command: {
    type: 'process';
    designJobId: string;
    traceContext?: DesignTraceContext;
  }): Promise<undefined>;
  async execute(command: DesignsExecuteCommand): Promise<DesignJobResponse | undefined> {
    switch (command.type) {
      case 'enqueue':
        return this.executeEnqueue(command.input, command.traceContext ?? {});
      case 'process':
        await this.executeProcess(command.designJobId, command.traceContext ?? {});
        return undefined;
    }
  }

  async query(command: {
    type: 'get';
    userId: string;
    designJobId: string;
  }): Promise<DesignJobResponse>;
  async query(command: {
    type: 'listByProject';
    input: ListByProjectQueryInput;
  }): Promise<ListByProjectResult>;
  async query(command: DesignsQuery): Promise<DesignJobResponse | ListByProjectResult> {
    switch (command.type) {
      case 'get':
        return this.queryGet(command.userId, command.designJobId);
      case 'listByProject':
        return this.queryListByProject(command.input);
    }
  }

  async maintenance(command: {
    type: 'reapStaleRunning';
    limit?: number;
  }): Promise<ReapStaleRunningResult>;
  async maintenance(command: DesignsMaintenanceCommand): Promise<ReapStaleRunningResult> {
    switch (command.type) {
      case 'reapStaleRunning':
        return this.maintenanceReapStaleRunning(command.limit);
    }
  }

  private async executeEnqueue(input: EnqueueDesignInput, traceContext: DesignTraceContext = {}) {
    const userPrompt = normalizeRequiredFormValue(input.userPrompt, {
      field: 'userPrompt',
      maxChars: CREATE_FORM_MAX_CHARS,
      errorFactory: (message) => new DesignValidationError(message),
    });
    const project = await this.projectRepository.getOwned(input.projectId, input.userId);
    if (!project) {
      throw new NotFoundError('project not found');
    }

    const usage = await this.resolveUsageWindow(input.userId);
    const used = await this.designJobRepository.countSucceededByUserInPeriod({
      userId: input.userId,
      periodStart: usage.periodStart,
      periodEnd: usage.periodEnd,
    });
    if (used >= usage.limit) {
      throw new DesignQuotaExceededError();
    }
    const concurrentLimit = await this.resolveConcurrentLimit(usage.planKey);
    const active = await this.designJobRepository.countActiveByUser(input.userId);
    if (active >= concurrentLimit) {
      throw new DesignConcurrencyLimitExceededError();
    }
    const job = await this.designJobRepository.create({
      projectId: input.projectId,
      userId: input.userId,
      userPrompt,
    });

    await this.dispatchOrRun(job, traceContext);

    return this.toResponse(job);
  }

  private async queryGet(userId: string, designJobId: string) {
    const job = await this.designJobRepository.getOwned(userId, designJobId);
    if (!job) {
      throw new NotFoundError('design job not found');
    }
    return this.toResponse(job);
  }

  private async queryListByProject(input: ListByProjectQueryInput): Promise<ListByProjectResult> {
    const project = await this.projectRepository.getOwned(input.projectId, input.userId);
    if (!project) {
      throw new NotFoundError('project not found');
    }

    const statuses = input.statuses;
    const limit = input.limit ?? DEFAULT_LIST_DESIGNS_LIMIT;
    const cursor = this.decodeListCursor(input.cursor);

    const listed = await this.designJobRepository.listByProjectOwned({
      userId: input.userId,
      projectId: input.projectId,
      statuses,
      limit,
      cursor,
    });

    const items = listed.items.map((job) => ({
      ...this.toResponse(job),
      projectId: job.projectId,
      promptPreview: this.toPromptPreview(job.userPrompt),
    }));

    const tail = listed.items.at(-1);
    return {
      projectId: input.projectId,
      items,
      nextCursor:
        listed.hasMore && tail
          ? this.encodeListCursor({ id: tail.id, createdAt: tail.createdAt })
          : null,
    };
  }

  private async executeProcess(designJobId: string, traceContext: DesignTraceContext = {}) {
    const requestId = traceContext.requestId ?? null;
    const traceId = traceContext.traceId ?? requestId ?? designJobId;

    const claimed = await this.designJobRepository.markRunning(designJobId);
    if (!claimed) {
      const existing = await this.designJobRepository.get(designJobId);
      if (!existing) {
        throw new NotFoundError('design job not found');
      }
      return;
    }

    const job = await this.designJobRepository.get(designJobId);
    if (!job) {
      return;
    }

    const trace: DesignTraceContext = {
      requestId,
      traceId,
      designId: job.id,
    };

    try {
      const result = await this.pipelineService.run(
        {
          designId: job.id,
          projectId: job.projectId,
          userPrompt: job.userPrompt,
          userId: job.userId,
        },
        trace,
      );

      const marked = await this.designJobRepository.markSucceededIfRunning({
        id: job.id,
        message: result.message,
        title: result.title,
        designId: result.designId ?? null,
      });
      if (!marked) {
        return;
      }
    } catch (error) {
      const failureMessage =
        error instanceof DesignValidationError ? error.message : DEFAULT_UNEXPECTED_FAILURE_MESSAGE;
      const failedStage = error instanceof DesignPipelineError ? error.stage : 'DESIGN_FINALIZE';
      const errorCode =
        error instanceof DesignPipelineError
          ? error.errorCode
          : this.inferErrorCode(error, 'DESIGN_FINALIZE_FAILED');
      const marked = await this.designJobRepository.markFailedIfRunning({
        id: job.id,
        errorMessage: failureMessage,
        errorStage: failedStage,
        errorCode,
        message: failureMessage,
        title: DEFAULT_FAILURE_TITLE,
        designId: error instanceof DesignPipelineError ? (error.designId ?? undefined) : undefined,
      });
      if (!marked) {
        return;
      }
      logger.info('design_trace_summary', {
        design_id: trace.designId,
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
      Number(process.env.DESIGN_RUNNING_TIMEOUT_MS) || DEFAULT_RUNNING_TIMEOUT_MS;
    const queuedTimeoutMs = Number(process.env.DESIGN_QUEUED_TIMEOUT_MS) || runningTimeoutMs;
    const runningStaleBefore = new Date(Date.now() - runningTimeoutMs);
    const queuedStaleBefore = new Date(Date.now() - queuedTimeoutMs);
    const envLimit =
      Number(process.env.DESIGN_STALE_REAP_BATCH_LIMIT) || DEFAULT_STALE_REAP_BATCH_LIMIT;
    const requested =
      typeof limit === 'number' && Number.isFinite(limit) ? Math.floor(limit) : envLimit;
    const batchLimit = requested <= 0 ? envLimit : Math.min(requested, MAX_STALE_REAP_BATCH_LIMIT);
    const staleRunningJobs = await this.designJobRepository.listRunningStale({
      staleBefore: runningStaleBefore,
      limit: batchLimit,
    });
    const staleQueuedJobs = await this.designJobRepository.listQueuedStale({
      staleBefore: queuedStaleBefore,
      limit: batchLimit,
    });

    let reapedRunning = 0;
    for (const job of staleRunningJobs) {
      const recovered = await this.designJobRepository.markFailedIfRunningStale({
        id: job.id,
        staleBefore: runningStaleBefore,
        errorMessage: DEFAULT_RUNNING_TIMEOUT_MESSAGE,
        errorStage: 'DESIGN_FINALIZE',
        errorCode: 'DESIGN_TIMEOUT_RUNNING',
        message: DEFAULT_RUNNING_TIMEOUT_MESSAGE,
        title: DEFAULT_FAILURE_TITLE,
      });
      if (!recovered) {
        continue;
      }

      reapedRunning += 1;
      logger.info('design_trace_summary', {
        design_id: job.id,
        trace_id: job.id,
        request_id: null,
        final_status: 'failed',
        failed_stage: 'DESIGN_FINALIZE',
        error_code: 'DESIGN_TIMEOUT_RUNNING',
      });
    }

    let reapedQueued = 0;
    for (const job of staleQueuedJobs) {
      const recovered = await this.designJobRepository.markFailedIfQueuedStale({
        id: job.id,
        staleBefore: queuedStaleBefore,
        errorMessage: DEFAULT_QUEUED_TIMEOUT_MESSAGE,
        errorStage: 'API_TASK_ENQUEUE',
        errorCode: 'DESIGN_TIMEOUT_QUEUED',
        message: DEFAULT_QUEUED_TIMEOUT_MESSAGE,
        title: DEFAULT_FAILURE_TITLE,
      });
      if (!recovered) {
        continue;
      }

      reapedQueued += 1;
      logger.info('design_trace_summary', {
        design_id: job.id,
        trace_id: job.id,
        request_id: null,
        final_status: 'failed',
        failed_stage: 'API_TASK_ENQUEUE',
        error_code: 'DESIGN_TIMEOUT_QUEUED',
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
    traceContext: DesignTraceContext,
  ) {
    const requestId = traceContext.requestId ?? null;
    const traceId = traceContext.traceId ?? requestId ?? job.id;

    if (!this.taskQueue || !this.taskQueue.isEnabled()) {
      void this.executeProcess(job.id, {
        requestId,
        traceId,
        designId: job.id,
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
      await this.designJobRepository.markFailed({
        id: job.id,
        errorMessage: `Failed to enqueue design task: ${message}`,
        errorStage: 'API_TASK_ENQUEUE',
        errorCode: 'TASK_ENQUEUE_FAILED',
        message: DEFAULT_UNEXPECTED_FAILURE_MESSAGE,
        title: DEFAULT_FAILURE_TITLE,
      });
      logger.info('design_trace_summary', {
        design_id: job.id,
        trace_id: traceId,
        request_id: requestId,
        final_status: 'failed',
        failed_stage: 'API_TASK_ENQUEUE',
        error_code: 'TASK_ENQUEUE_FAILED',
      });
    }
  }

  private async resolveUsageWindow(userId: string): Promise<{
    periodStart: Date;
    periodEnd: Date;
    limit: number;
    planKey: PlanKey;
  }> {
    const subscription = await this.billingCache.getSubscription(userId, () =>
      this.billingRepository.findSubscriptionByUserId(userId),
    );
    const planKey = await this.resolveEffectivePlanKey(subscription);

    const now = new Date();
    const { start: periodStart, end: periodEnd } = getUtcMonthWindow(now);
    const limit = await this.resolveMonthlyLimit(planKey);
    return {
      periodStart,
      periodEnd,
      limit,
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

  private async resolveMonthlyLimit(planKey: PlanKey): Promise<number> {
    try {
      const record = await this.billingCache.getPlanDesignLimit(planKey, () =>
        this.billingRepository.findPlanDesignLimit(planKey),
      );
      const limit = record?.monthlyDesignLimit ?? null;
      if (limit && Number.isFinite(limit) && limit > 0) {
        return limit;
      }
    } catch {}
    throw new Error(`design_plan_limit_missing:${planKey}`);
  }

  private async resolveConcurrentLimit(planKey: PlanKey): Promise<number> {
    try {
      const record = await this.billingCache.getPlanDesignLimit(planKey, () =>
        this.billingRepository.findPlanDesignLimit(planKey),
      );
      const limit = record?.concurrentDesignLimit ?? null;
      if (limit && Number.isFinite(limit) && limit > 0) {
        return limit;
      }
    } catch {}
    throw new Error(`design_plan_limit_missing:${planKey}`);
  }

  private toResponse(job: {
    id: string;
    status: string;
    userPrompt?: string | null;
    compiledPrompt?: string | null;
    message?: string | null;
    title?: string | null;
    designId?: string | null;
    errorMessage?: string | null;
    errorStage?: string | null;
    errorCode?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      designJobId: job.id,
      status: job.status,
      userPrompt: job.userPrompt ?? null,
      message: job.message ?? null,
      title: job.title ?? null,
      designId: job.designId ?? null,
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
    if (!normalized) return 'Design request';
    return truncateText(normalized, 80, '...');
  }

  private decodeListCursor(cursor?: string | null): DesignListCursor | null {
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
      throw new DesignValidationError('invalid cursor');
    }
  }

  private encodeListCursor(cursor: DesignListCursor): string {
    return Buffer.from(
      JSON.stringify({
        id: cursor.id,
        createdAt: cursor.createdAt.toISOString(),
      }),
      'utf8',
    ).toString('base64url');
  }

  private inferErrorCode(error: unknown, fallback: string): string {
    return inferDesignErrorCode(error, fallback);
  }
}
