import type { AiDesignRepository } from '../../repositories/ai/design.repository';
import { AiDesignRepositoryError } from '../../repositories/ai/design.repository';
import type { PromptCompilerRepository } from '../../repositories/ai/prompt-compiler.repository';
import { PromptCompilerRepositoryError } from '../../repositories/ai/prompt-compiler.repository';
import { buildDesignObjectPath } from '../../entities/design';
import type { IGcsRepository, IDesignRepository } from '../../repositories/interfaces';
import type { DesignJobRepositoryPostgres } from '../../repositories/postgres/design-job.repository';
import { inferDesignErrorCode } from './design-error-code.policy';
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
    executionStatus: 'success' | 'failed';
    previewStatus: 'unverified' | 'succeeded' | 'failed';
    previewError: string | null;
    trace: DesignTraceContext;
  }): Promise<string> {
    let designId: string | null = null;
    try {
      const createdDesign = await this.designRepository.create({
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
}
