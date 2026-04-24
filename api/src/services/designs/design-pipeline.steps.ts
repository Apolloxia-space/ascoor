import type { AiDesignRepository } from '../../repositories/ai/design.repository';
import { AiDesignRepositoryError } from '../../repositories/ai/design.repository';
import type {
  AiPackPlanRepository,
  AssetPackPlan,
} from '../../repositories/ai/asset-pack-plan.repository';
import { AiPackPlanRepositoryError } from '../../repositories/ai/asset-pack-plan.repository';
import type { PromptCompilerRepository } from '../../repositories/ai/prompt-compiler.repository';
import { PromptCompilerRepositoryError } from '../../repositories/ai/prompt-compiler.repository';
import { buildDesignObjectPath, buildDesignPartObjectPath } from '../../entities/design';
import type { IGcsRepository, IDesignRepository } from '../../repositories/interfaces';
import type { DesignJobRepositoryPostgres } from '../../repositories/postgres/design-job.repository';
import { inferDesignErrorCode } from './design-error-code.policy';
import { logger } from '../../utils/logger';
import { buildPartPrompt, type GeneratedAssetPart } from './asset-pack-code';
import {
  type AiInvokeOutput,
  DesignPipelineError,
  type DesignTraceContext,
} from './design-pipeline.types';

export class CompilePromptStep {
  readonly designJobRepository: DesignJobRepositoryPostgres;
  private readonly promptCompilerRepository?: PromptCompilerRepository;

  constructor(
    designJobRepository: DesignJobRepositoryPostgres,
    promptCompilerRepository?: PromptCompilerRepository,
  ) {
    this.designJobRepository = designJobRepository;
    this.promptCompilerRepository = promptCompilerRepository;
  }

  async run(params: {
    designId: string;
    userPrompt: string;
    userId: string;
    trace: DesignTraceContext;
  }): Promise<string> {
    let compiledPrompt = params.userPrompt.trim();
    if (!compiledPrompt) {
      throw new DesignPipelineError(
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
            designId: params.trace.designId ?? undefined,
            traceId: params.trace.traceId ?? undefined,
            requestId: params.trace.requestId ?? undefined,
          },
        });
        compiledPrompt = compiled.compiledPrompt.trim();
        if (!compiledPrompt) {
          throw new PromptCompilerRepositoryError('Compiled prompt is empty.');
        }
      }

      const designRepositoryWithUpdate = this.designJobRepository as DesignJobRepositoryPostgres & {
        updateCompiledPrompt?: (args: {
          designId: string;
          compiledPrompt: string;
        }) => Promise<boolean>;
      };
      const stored = designRepositoryWithUpdate.updateCompiledPrompt
        ? await designRepositoryWithUpdate.updateCompiledPrompt({
            designId: params.designId,
            compiledPrompt,
          })
        : true;
      if (!stored) {
        throw new Error(`Failed to update compiled prompt for design ${params.designId}.`);
      }
      return compiledPrompt;
    } catch (error) {
      const code = inferDesignErrorCode(error, 'PROMPT_COMPILE_FAILED');
      if (error instanceof PromptCompilerRepositoryError) {
        throw new DesignPipelineError(
          'PROMPT_COMPILE',
          code,
          `Failed to compile prompt: ${error.message}`,
        );
      }
      if (error instanceof DesignPipelineError) {
        throw error;
      }
      throw new DesignPipelineError(
        'PROMPT_COMPILE',
        code,
        (error as Error)?.message ?? String(error),
      );
    }
  }
}

export class InvokeAiAgentStep {
  constructor(private readonly aiRepository: AiDesignRepository) {}

  async run(params: {
    promptWithContext: string;
    userPrompt: string;
    userId: string;
    trace: DesignTraceContext;
  }): Promise<AiInvokeOutput> {
    let aiResult: Awaited<ReturnType<AiDesignRepository['design']>>;
    try {
      aiResult = await this.aiRepository.design({
        prompt: params.promptWithContext,
        userPrompt: params.userPrompt,
        userId: params.userId,
        trace: {
          designId: params.trace.designId ?? undefined,
          traceId: params.trace.traceId ?? undefined,
          requestId: params.trace.requestId ?? undefined,
        },
      });
    } catch (error) {
      const code = inferDesignErrorCode(error, 'AI_AGENT_INVOKE_FAILED');
      if (error instanceof AiDesignRepositoryError) {
        throw new DesignPipelineError('AI_AGENT_INVOKE', code, error.message);
      }
      throw new DesignPipelineError(
        'AI_AGENT_INVOKE',
        code,
        (error as Error)?.message ?? String(error),
      );
    }

    const title = aiResult.title.trim();
    if (!title) {
      throw new DesignPipelineError(
        'AI_AGENT_INVOKE',
        'AI_AGENT_INVALID_TITLE',
        'Failed to design a title.',
      );
    }
    const code = aiResult.code?.trim() ?? '';
    if (!code) {
      throw new DesignPipelineError(
        'AI_AGENT_INVOKE',
        'AI_AGENT_EMPTY_CODE',
        'Model design did not return executable code.',
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
    trace: DesignTraceContext;
  }): Promise<AssetPackPlan> {
    try {
      return await this.packPlanRepository.plan({
        prompt: params.promptWithContext,
        userPrompt: params.userPrompt,
        userId: params.userId,
        trace: {
          designId: params.trace.designId ?? undefined,
          traceId: params.trace.traceId ?? undefined,
          requestId: params.trace.requestId ?? undefined,
        },
      });
    } catch (error) {
      const code = inferDesignErrorCode(error, 'PACK_PLAN_FAILED');
      if (error instanceof AiPackPlanRepositoryError) {
        throw new DesignPipelineError('PACK_PLAN', code, error.message);
      }
      throw new DesignPipelineError('PACK_PLAN', code, (error as Error)?.message ?? String(error));
    }
  }
}

export class GenerateAssetPartsStep {
  constructor(
    private readonly aiRepository: AiDesignRepository,
    private readonly designRepository: IDesignRepository,
    private readonly gcsRepository: IGcsRepository,
  ) {}

  async run(params: {
    designId: string;
    plan: AssetPackPlan;
    userPrompt: string;
    userId: string;
    trace: DesignTraceContext;
  }): Promise<Array<GeneratedAssetPart>> {
    const parts: Array<GeneratedAssetPart> = [];
    for (const part of params.plan.parts) {
      try {
        await this.designRepository.updatePart({
          designId: params.designId,
          slug: part.slug,
          status: 'generating',
          assetUriTs: null,
          errorMessage: null,
        });

        const aiResult = await this.aiRepository.design({
          prompt: buildPartPrompt({
            packTitle: params.plan.title,
            originalPrompt: params.userPrompt,
            partPrompt: part.prompt,
          }),
          userPrompt: part.prompt,
          userId: params.userId,
          skipTitle: true,
          trace: {
            designId: params.trace.designId ?? undefined,
            traceId: params.trace.traceId ?? undefined,
            requestId: params.trace.requestId ?? undefined,
          },
        });

        const code = aiResult.code?.trim() ?? '';
        if (!code) {
          throw new DesignPipelineError(
            'PART_GENERATION',
            'AI_AGENT_EMPTY_PART_CODE',
            `Part ${part.slug} did not return executable code.`,
          );
        }

        const partPath = buildDesignPartObjectPath({
          designId: params.designId,
          partSlug: part.slug,
          userId: params.userId,
        });
        const uploadedPart = await this.gcsRepository.upload({
          objectPath: partPath.objectPath,
          content: code,
          contentType: partPath.contentType,
          metadata: {
            execution_status: 'success',
            design_id: params.designId,
            part_slug: part.slug,
          },
        });
        await this.designRepository.updatePart({
          designId: params.designId,
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
        const code = inferDesignErrorCode(error, 'PART_GENERATION_FAILED');
        const rawMessage =
          error instanceof DesignPipelineError || error instanceof AiDesignRepositoryError
            ? error.message
            : ((error as Error)?.message ?? String(error));
        const message = `Failed to generate part ${part.slug}: ${rawMessage}`;
        await this.designRepository.updatePart({
          designId: params.designId,
          slug: part.slug,
          status: 'failed',
          assetUriTs: null,
          errorMessage: message,
        });
        logger.warn('asset_pack_part_generation_failed', {
          design_id: params.designId,
          trace_id: params.trace.traceId ?? null,
          request_id: params.trace.requestId ?? null,
          part_slug: part.slug,
          error_code: code,
          error: rawMessage,
        });
      }
    }
    if (parts.length < 3) {
      throw new DesignPipelineError(
        'PART_GENERATION',
        'PART_GENERATION_INSUFFICIENT_PARTS',
        `Only ${parts.length} asset part(s) were generated. At least 3 completed parts are required.`,
        params.designId,
      );
    }
    return parts;
  }
}

export class PersistTypeScriptAssetStep {
  constructor(
    private readonly designRepository: IDesignRepository,
    private readonly designJobRepository: DesignJobRepositoryPostgres,
    private readonly gcsRepository: IGcsRepository,
  ) {}

  async run(params: {
    projectId: string;
    userId: string;
    displayName: string;
    code: string;
    packPlan?: AssetPackPlan;
    parts?: Array<GeneratedAssetPart>;
    executionStatus: 'success' | 'failed';
    previewStatus: 'unverified' | 'succeeded' | 'failed';
    previewError: string | null;
    trace: DesignTraceContext;
  }): Promise<string> {
    let designId: string | null = null;
    try {
      const createdDesign =
        params.packPlan && params.parts
          ? await this.designRepository.createAssetPack({
              projectId: params.projectId,
              displayName: params.displayName,
              packPlan: params.packPlan,
              parts: [],
            })
          : await this.designRepository.create({
              projectId: params.projectId,
              displayName: params.displayName,
            });
      designId = createdDesign.id;
      const designJobId = params.trace.designId ?? null;
      if (designJobId) {
        const linked = await this.designJobRepository.linkDesignIfMissing({
          designId: designJobId,
          resultDesignId: createdDesign.id,
        });
        if (!linked) {
          throw new Error(
            `Failed to link design job ${designJobId} to design ${createdDesign.id}.`,
          );
        }
      }
      const { objectPath, contentType } = buildDesignObjectPath({
        designId: createdDesign.id,
        userId: params.userId,
      });
      const uploadedParts = [];
      for (const part of params.parts ?? []) {
        const partPath = buildDesignPartObjectPath({
          designId: createdDesign.id,
          partSlug: part.slug,
          userId: params.userId,
        });
        const uploadedPart = await this.gcsRepository.upload({
          objectPath: partPath.objectPath,
          content: part.code,
          contentType: partPath.contentType,
          metadata: {
            execution_status: params.executionStatus,
            design_id: createdDesign.id,
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
      await this.designRepository.updatePreview({
        designId: createdDesign.id,
        assetUriTs: uploaded.gcsUri,
        previewStatus: params.previewStatus,
        previewError: params.previewError,
      });
      if (params.packPlan && uploadedParts.length > 0) {
        await this.designRepository.createParts({
          designId: createdDesign.id,
          parts: uploadedParts,
        });
      }
      return createdDesign.id;
    } catch (error) {
      throw new DesignPipelineError(
        'ASSET_PERSIST_TS',
        'ASSET_UPLOAD_FAILED',
        (error as Error)?.message ?? String(error),
        designId,
      );
    }
  }

  async createAssetPackShell(params: {
    projectId: string;
    displayName: string;
    packPlan: AssetPackPlan;
    trace: DesignTraceContext;
  }): Promise<string> {
    let designId: string | null = null;
    try {
      const createdDesign = await this.designRepository.createAssetPack({
        projectId: params.projectId,
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
      designId = createdDesign.id;

      const designJobId = params.trace.designId ?? null;
      if (designJobId) {
        const linked = await this.designJobRepository.linkDesignIfMissing({
          designId: designJobId,
          resultDesignId: createdDesign.id,
        });
        if (!linked) {
          throw new Error(
            `Failed to link design job ${designJobId} to design ${createdDesign.id}.`,
          );
        }
      }

      return createdDesign.id;
    } catch (error) {
      throw new DesignPipelineError(
        'ASSET_PERSIST_TS',
        'ASSET_UPLOAD_FAILED',
        (error as Error)?.message ?? String(error),
        designId,
      );
    }
  }

  async persistPackPreview(params: {
    designId: string;
    userId: string;
    code: string;
    executionStatus: 'success' | 'failed';
    previewStatus: 'unverified' | 'succeeded' | 'failed';
    previewError: string | null;
  }): Promise<string> {
    try {
      const { objectPath, contentType } = buildDesignObjectPath({
        designId: params.designId,
        userId: params.userId,
      });
      const uploaded = await this.gcsRepository.upload({
        objectPath,
        content: params.code,
        contentType,
        metadata: { execution_status: params.executionStatus },
      });
      await this.designRepository.updatePreview({
        designId: params.designId,
        assetUriTs: uploaded.gcsUri,
        previewStatus: params.previewStatus,
        previewError: params.previewError,
      });
      return params.designId;
    } catch (error) {
      throw new DesignPipelineError(
        'ASSET_PERSIST_TS',
        'ASSET_UPLOAD_FAILED',
        (error as Error)?.message ?? String(error),
        params.designId,
      );
    }
  }
}
