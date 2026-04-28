import type { AiAssetPackRepository } from '../../repositories/ai/assetPack.repository';
import { AiAssetPackRepositoryError } from '../../repositories/ai/assetPack.repository';
import type {
  AiPackPlanRepository,
  AssetPackPlan,
} from '../../repositories/ai/asset-pack-plan.repository';
import { AiPackPlanRepositoryError } from '../../repositories/ai/asset-pack-plan.repository';
import type { PromptCompilerRepository } from '../../repositories/ai/prompt-compiler.repository';
import { PromptCompilerRepositoryError } from '../../repositories/ai/prompt-compiler.repository';
import { buildAssetPackObjectPath, buildAssetPartObjectPath } from '../../entities/assetPack';
import type { IGcsRepository, IAssetPackRepository } from '../../repositories/interfaces';
import type { PackGenerationJobRepositoryPostgres } from '../../repositories/postgres/assetPack-job.repository';
import type { BillingRepository } from '../../repositories/postgres/billing.repository';
import { inferAssetPackErrorCode } from './assetPack-error-code.policy';
import { logger } from '../../utils/logger';
import { getUtcMonthWindow } from '../../utils/date';
import { buildPartPrompt, type GeneratedAssetPart } from './asset-pack-code';
import {
  type AiInvokeOutput,
  AssetPackPipelineError,
  type AssetPackTraceContext,
} from './assetPack-pipeline.types';

export class CompilePromptStep {
  readonly packGenerationJobRepository: PackGenerationJobRepositoryPostgres;
  private readonly promptCompilerRepository?: PromptCompilerRepository;

  constructor(
    packGenerationJobRepository: PackGenerationJobRepositoryPostgres,
    promptCompilerRepository?: PromptCompilerRepository,
  ) {
    this.packGenerationJobRepository = packGenerationJobRepository;
    this.promptCompilerRepository = promptCompilerRepository;
  }

  async run(params: {
    packGenerationJobId: string;
    userPrompt: string;
    userId: string;
    trace: AssetPackTraceContext;
  }): Promise<string> {
    let compiledPrompt = params.userPrompt.trim();
    if (!compiledPrompt) {
      throw new AssetPackPipelineError(
        'PROMPT_COMPILE',
        'PROMPT_COMPILE_EMPTY',
        'User prompt is empty.',
      );
    }
    try {
      if (this.promptCompilerRepository) {
        const compiled = await this.promptCompilerRepository.compile({
          userPrompt: params.userPrompt,
          userId: params.userId,
          trace: {
            packGenerationJobId: params.trace.packGenerationJobId ?? undefined,
            traceId: params.trace.traceId ?? undefined,
            requestId: params.trace.requestId ?? undefined,
          },
        });
        compiledPrompt = compiled.compiledPrompt.trim();
        if (!compiledPrompt) {
          throw new PromptCompilerRepositoryError('Compiled prompt is empty.');
        }
      }

      const assetPackRepositoryWithUpdate = this.packGenerationJobRepository as PackGenerationJobRepositoryPostgres & {
        updateCompiledPrompt?: (args: {
          packGenerationJobId: string;
          compiledPrompt: string;
        }) => Promise<boolean>;
      };
      const stored = assetPackRepositoryWithUpdate.updateCompiledPrompt
        ? await assetPackRepositoryWithUpdate.updateCompiledPrompt({
            packGenerationJobId: params.packGenerationJobId,
            compiledPrompt,
          })
        : true;
      if (!stored) {
        throw new Error(
          `Failed to update compiled prompt for pack generation job ${params.packGenerationJobId}.`,
        );
      }
      return compiledPrompt;
    } catch (error) {
      const code = inferAssetPackErrorCode(error, 'PROMPT_COMPILE_FAILED');
      if (error instanceof PromptCompilerRepositoryError) {
        throw new AssetPackPipelineError(
          'PROMPT_COMPILE',
          code,
          `Failed to compile prompt: ${error.message}`,
        );
      }
      if (error instanceof AssetPackPipelineError) {
        throw error;
      }
      throw new AssetPackPipelineError(
        'PROMPT_COMPILE',
        code,
        (error as Error)?.message ?? String(error),
      );
    }
  }
}

export class InvokeAiAgentStep {
  constructor(private readonly aiRepository: AiAssetPackRepository) {}

  async run(params: {
    promptWithContext: string;
    userPrompt: string;
    userId: string;
    trace: AssetPackTraceContext;
  }): Promise<AiInvokeOutput> {
    let aiResult: Awaited<ReturnType<AiAssetPackRepository['assetPack']>>;
    try {
      aiResult = await this.aiRepository.assetPack({
        prompt: params.promptWithContext,
        userPrompt: params.userPrompt,
        userId: params.userId,
        trace: {
          packGenerationJobId: params.trace.packGenerationJobId ?? undefined,
          traceId: params.trace.traceId ?? undefined,
          requestId: params.trace.requestId ?? undefined,
        },
      });
    } catch (error) {
      const code = inferAssetPackErrorCode(error, 'AI_AGENT_INVOKE_FAILED');
      if (error instanceof AiAssetPackRepositoryError) {
        throw new AssetPackPipelineError('AI_AGENT_INVOKE', code, error.message);
      }
      throw new AssetPackPipelineError(
        'AI_AGENT_INVOKE',
        code,
        (error as Error)?.message ?? String(error),
      );
    }

    const title = aiResult.title.trim();
    if (!title) {
      throw new AssetPackPipelineError(
        'AI_AGENT_INVOKE',
        'AI_AGENT_INVALID_TITLE',
        'Failed to generate an asset pack title.',
      );
    }
    const code = aiResult.code?.trim() ?? '';
    if (!code) {
      throw new AssetPackPipelineError(
        'AI_AGENT_INVOKE',
        'AI_AGENT_EMPTY_CODE',
        'Model assetPack did not return executable code.',
      );
    }
    return {
      message: aiResult.message.trim() || 'Generated a message.',
      title,
      code,
    };
  }
}

export class PlanAssetPackStep {
  constructor(private readonly packPlanRepository: AiPackPlanRepository) {}

  async run(params: {
    promptWithContext: string;
    userPrompt: string;
    userId: string;
    trace: AssetPackTraceContext;
  }): Promise<AssetPackPlan> {
    try {
      return await this.packPlanRepository.plan({
        prompt: params.promptWithContext,
        userPrompt: params.userPrompt,
        userId: params.userId,
        trace: {
          packGenerationJobId: params.trace.packGenerationJobId ?? undefined,
          traceId: params.trace.traceId ?? undefined,
          requestId: params.trace.requestId ?? undefined,
        },
      });
    } catch (error) {
      const code = inferAssetPackErrorCode(error, 'PACK_PLAN_FAILED');
      if (error instanceof AiPackPlanRepositoryError) {
        throw new AssetPackPipelineError('PACK_PLAN', code, error.message);
      }
      throw new AssetPackPipelineError('PACK_PLAN', code, (error as Error)?.message ?? String(error));
    }
  }
}

export class GenerateAssetPartsStep {
  constructor(
    private readonly aiRepository: AiAssetPackRepository,
    private readonly assetPackRepository: IAssetPackRepository,
    private readonly gcsRepository: IGcsRepository,
    private readonly billingRepository?: BillingRepository,
  ) {}

  async run(params: {
    assetPackId: string;
    plan: AssetPackPlan;
    userPrompt: string;
    userId: string;
    trace: AssetPackTraceContext;
  }): Promise<Array<GeneratedAssetPart>> {
    const parts: Array<GeneratedAssetPart> = [];
    for (const part of params.plan.parts) {
      try {
        await this.assetPackRepository.updatePart({
          assetPackId: params.assetPackId,
          slug: part.slug,
          status: 'generating',
          assetUriTs: null,
          errorMessage: null,
        });

        const aiResult = await this.aiRepository.assetPack({
          prompt: buildPartPrompt({
            packTitle: params.plan.title,
            originalPrompt: params.userPrompt,
            partPrompt: part.prompt,
          }),
          userPrompt: part.prompt,
          userId: params.userId,
          skipTitle: true,
          trace: {
            packGenerationJobId: params.trace.packGenerationJobId ?? undefined,
            traceId: params.trace.traceId ?? undefined,
            requestId: params.trace.requestId ?? undefined,
          },
        });

        const code = aiResult.code?.trim() ?? '';
        if (!code) {
          throw new AssetPackPipelineError(
            'PART_GENERATION',
            'AI_AGENT_EMPTY_PART_CODE',
            `Part ${part.slug} did not return executable code.`,
          );
        }

        const partPath = buildAssetPartObjectPath({
          assetPackId: params.assetPackId,
          partSlug: part.slug,
          userId: params.userId,
        });
        const uploadedPart = await this.gcsRepository.upload({
          objectPath: partPath.objectPath,
          content: code,
          contentType: partPath.contentType,
          metadata: {
            execution_status: 'success',
            asset_pack_id: params.assetPackId,
            part_slug: part.slug,
          },
        });
        if (this.billingRepository) {
          const { start: periodStart, end: periodEnd } = getUtcMonthWindow(new Date());
          const consumed = await this.billingRepository.consumeCreditsIfAvailable({
            userId: params.userId,
            amount: 1,
            reason: 'asset_generation',
            periodStart,
            periodEnd,
            relatedAssetPackId: params.assetPackId,
            relatedPartId: part.slug,
            idempotencyKey: `asset_generation:${params.userId}:${params.assetPackId}:${part.slug}`,
          });
          if (!consumed) {
            throw new AssetPackPipelineError(
              'PART_GENERATION',
              'CREDIT_BALANCE_INSUFFICIENT',
              `Not enough credits remaining to complete part ${part.slug}.`,
            );
          }
        }
        await this.assetPackRepository.updatePart({
          assetPackId: params.assetPackId,
          slug: part.slug,
          status: 'completed',
          assetUriTs: uploadedPart.gcsUri,
          errorMessage: null,
        });

        parts.push({
          slug: part.slug,
          displayName: part.displayName,
          description: part.description,
          prompt: part.prompt,
          code,
          assetUriTs: uploadedPart.gcsUri,
        });
      } catch (error) {
        const code = inferAssetPackErrorCode(error, 'PART_GENERATION_FAILED');
        const rawMessage =
          error instanceof AssetPackPipelineError || error instanceof AiAssetPackRepositoryError
            ? error.message
            : ((error as Error)?.message ?? String(error));
        const message = `Failed to generate part ${part.slug}: ${rawMessage}`;
        await this.assetPackRepository.updatePart({
          assetPackId: params.assetPackId,
          slug: part.slug,
          status: 'failed',
          assetUriTs: null,
          errorMessage: message,
        });
        logger.warn('asset_pack_part_generation_failed', {
          asset_pack_id: params.assetPackId,
          trace_id: params.trace.traceId ?? null,
          request_id: params.trace.requestId ?? null,
          part_slug: part.slug,
          error_code: code,
          error: rawMessage,
        });
      }
    }
    if (parts.length < 3) {
      throw new AssetPackPipelineError(
        'PART_GENERATION',
        'PART_GENERATION_INSUFFICIENT_PARTS',
        `Only ${parts.length} asset part(s) were generated. At least 3 completed parts are required.`,
        params.assetPackId,
      );
    }
    return parts;
  }
}

export class PersistTypeScriptAssetStep {
  constructor(
    private readonly assetPackRepository: IAssetPackRepository,
    private readonly packGenerationJobRepository: PackGenerationJobRepositoryPostgres,
    private readonly gcsRepository: IGcsRepository,
  ) {}

  async run(params: {
    workspaceId: string;
    userId: string;
    displayName: string;
    code: string;
    packPlan?: AssetPackPlan;
    parts?: Array<GeneratedAssetPart>;
    executionStatus: 'success' | 'failed';
    previewStatus: 'unverified' | 'succeeded' | 'failed';
    previewError: string | null;
    trace: AssetPackTraceContext;
  }): Promise<string> {
    let assetPackId: string | null = null;
    try {
      const createdAssetPack =
        params.packPlan && params.parts
          ? await this.assetPackRepository.createAssetPack({
              workspaceId: params.workspaceId,
              displayName: params.displayName,
              packPlan: params.packPlan,
              parts: [],
            })
          : await this.assetPackRepository.create({
              workspaceId: params.workspaceId,
              displayName: params.displayName,
            });
      assetPackId = createdAssetPack.id;
      const packGenerationJobId = params.trace.packGenerationJobId ?? null;
      if (packGenerationJobId) {
        const linked = await this.packGenerationJobRepository.linkAssetPackIfMissing({
          packGenerationJobId,
          resultAssetPackId: createdAssetPack.id,
        });
        if (!linked) {
          throw new Error(
            `Failed to link pack generation job ${packGenerationJobId} to assetPack ${createdAssetPack.id}.`,
          );
        }
      }
      const { objectPath, contentType } = buildAssetPackObjectPath({
        assetPackId: createdAssetPack.id,
        userId: params.userId,
      });
      const uploadedParts = [];
      for (const part of params.parts ?? []) {
        const partPath = buildAssetPartObjectPath({
          assetPackId: createdAssetPack.id,
          partSlug: part.slug,
          userId: params.userId,
        });
        const uploadedPart = await this.gcsRepository.upload({
          objectPath: partPath.objectPath,
          content: part.code,
          contentType: partPath.contentType,
          metadata: {
            execution_status: params.executionStatus,
            asset_pack_id: createdAssetPack.id,
            part_slug: part.slug,
          },
        });
        uploadedParts.push({
          slug: part.slug,
          displayName: part.displayName,
          description: part.description,
          prompt: part.prompt,
          assetUriTs: uploadedPart.gcsUri,
          sortOrder: uploadedParts.length,
        });
      }
      const uploaded = await this.gcsRepository.upload({
        objectPath,
        content: params.code,
        contentType,
        metadata: { execution_status: params.executionStatus },
      });
      await this.assetPackRepository.updatePreview({
        assetPackId: createdAssetPack.id,
        assetUriTs: uploaded.gcsUri,
        previewStatus: params.previewStatus,
        previewError: params.previewError,
      });
      if (params.packPlan && uploadedParts.length > 0) {
        await this.assetPackRepository.createParts({
          assetPackId: createdAssetPack.id,
          parts: uploadedParts,
        });
      }
      return createdAssetPack.id;
    } catch (error) {
      throw new AssetPackPipelineError(
        'ASSET_PERSIST_TS',
        'ASSET_UPLOAD_FAILED',
        (error as Error)?.message ?? String(error),
        assetPackId,
      );
    }
  }

  async createAssetPackShell(params: {
    workspaceId: string;
    displayName: string;
    packPlan: AssetPackPlan;
    trace: AssetPackTraceContext;
  }): Promise<string> {
    let assetPackId: string | null = null;
    try {
      const createdAssetPack = await this.assetPackRepository.createAssetPack({
        workspaceId: params.workspaceId,
        displayName: params.displayName,
        packPlan: params.packPlan,
        parts: params.packPlan.parts.map((part, index) => ({
          slug: part.slug,
          displayName: part.displayName,
          description: part.description,
          prompt: part.prompt,
          status: 'pending',
          assetUriTs: null,
          errorMessage: null,
          sortOrder: index,
        })),
      });
      assetPackId = createdAssetPack.id;

      const packGenerationJobId = params.trace.packGenerationJobId ?? null;
      if (packGenerationJobId) {
        const linked = await this.packGenerationJobRepository.linkAssetPackIfMissing({
          packGenerationJobId,
          resultAssetPackId: createdAssetPack.id,
        });
        if (!linked) {
          throw new Error(
            `Failed to link pack generation job ${packGenerationJobId} to assetPack ${createdAssetPack.id}.`,
          );
        }
      }

      return createdAssetPack.id;
    } catch (error) {
      throw new AssetPackPipelineError(
        'ASSET_PERSIST_TS',
        'ASSET_UPLOAD_FAILED',
        (error as Error)?.message ?? String(error),
        assetPackId,
      );
    }
  }

  async persistPackPreview(params: {
    assetPackId: string;
    userId: string;
    code: string;
    executionStatus: 'success' | 'failed';
    previewStatus: 'unverified' | 'succeeded' | 'failed';
    previewError: string | null;
  }): Promise<string> {
    try {
      const { objectPath, contentType } = buildAssetPackObjectPath({
        assetPackId: params.assetPackId,
        userId: params.userId,
      });
      const uploaded = await this.gcsRepository.upload({
        objectPath,
        content: params.code,
        contentType,
        metadata: { execution_status: params.executionStatus },
      });
      await this.assetPackRepository.updatePreview({
        assetPackId: params.assetPackId,
        assetUriTs: uploaded.gcsUri,
        previewStatus: params.previewStatus,
        previewError: params.previewError,
      });
      return params.assetPackId;
    } catch (error) {
      throw new AssetPackPipelineError(
        'ASSET_PERSIST_TS',
        'ASSET_UPLOAD_FAILED',
        (error as Error)?.message ?? String(error),
        params.assetPackId,
      );
    }
  }
}
