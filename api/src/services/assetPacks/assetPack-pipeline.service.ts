import type { AiPackPlanRepository } from '../../repositories/ai/asset-pack-plan.repository';
import type { AiAssetPackRepository } from '../../repositories/ai/assetPack.repository';
import type { PromptCompilerRepository } from '../../repositories/ai/prompt-compiler.repository';
import type { IGcsRepository, IAssetPackRepository } from '../../repositories/interfaces';
import type { WorkspaceRepository } from '../../repositories/postgres/workspace.repository';
import type { PackGenerationJobRepositoryPostgres } from '../../repositories/postgres/assetPack-job.repository';
import type { BillingRepository } from '../../repositories/postgres/billing.repository';
import { NotFoundError } from '../../usecases/errors';
import {
  CompilePromptStep,
  GenerateAssetPartsStep,
  InvokeAiAgentStep,
  PlanAssetPackStep,
  PersistTypeScriptAssetStep,
} from './assetPack-pipeline.steps';
import { composeAssetPackPreviewCode } from './asset-pack-code';
import type {
  AssetPackPipelineResult,
  AssetPackPipelineRunInput,
  AssetPackTraceContext,
} from './assetPack-pipeline.types';

export type {
  AssetPackPipelineResult,
  AssetPackPipelineRunInput,
  AssetPackStage,
  AssetPackTraceContext,
} from './assetPack-pipeline.types';
export { AssetPackPipelineError } from './assetPack-pipeline.types';

type AssetPackPipelineDeps = {
  aiRepository: AiAssetPackRepository;
  packPlanRepository?: AiPackPlanRepository;
  assetPackRepository: IAssetPackRepository;
  workspaceRepository: WorkspaceRepository;
  gcsRepository: IGcsRepository;
  packGenerationJobRepository: PackGenerationJobRepositoryPostgres;
  billingRepository?: BillingRepository;
  promptCompilerRepository?: PromptCompilerRepository;
};

export class AssetPackPipelineService {
  private readonly compilePromptStep: CompilePromptStep;
  private readonly invokeAiAgentStep: InvokeAiAgentStep;
  private readonly planAssetPackStep?: PlanAssetPackStep;
  private readonly generateAssetPartsStep: GenerateAssetPartsStep;
  private readonly persistTypeScriptAssetStep: PersistTypeScriptAssetStep;

  constructor(private readonly deps: AssetPackPipelineDeps) {
    this.compilePromptStep = new CompilePromptStep(
      deps.packGenerationJobRepository,
      deps.promptCompilerRepository,
    );
    this.invokeAiAgentStep = new InvokeAiAgentStep(deps.aiRepository);
    this.planAssetPackStep = deps.packPlanRepository
      ? new PlanAssetPackStep(deps.packPlanRepository)
      : undefined;
    this.generateAssetPartsStep = new GenerateAssetPartsStep(
      deps.aiRepository,
      deps.assetPackRepository,
      deps.gcsRepository,
      deps.billingRepository,
    );
    this.persistTypeScriptAssetStep = new PersistTypeScriptAssetStep(
      deps.assetPackRepository,
      deps.packGenerationJobRepository,
      deps.gcsRepository,
    );
  }

  async run(
    input: AssetPackPipelineRunInput,
    traceContext: AssetPackTraceContext,
  ): Promise<AssetPackPipelineResult> {
    const requestId = traceContext.requestId ?? null;
    const packGenerationJobId = traceContext.packGenerationJobId ?? input.packGenerationJobId;
    const traceId = traceContext.traceId ?? requestId ?? packGenerationJobId;
    const trace: AssetPackTraceContext = {
      requestId,
      traceId,
      packGenerationJobId,
    };

    const workspace = await this.deps.workspaceRepository.getOwned(input.workspaceId, input.userId);
    if (!workspace) {
      throw new NotFoundError('workspace not found');
    }

    const compiledPrompt = await this.compilePromptStep.run({
      packGenerationJobId: input.packGenerationJobId,
      userPrompt: input.userPrompt,
      userId: input.userId,
      trace,
    });

    if (!this.planAssetPackStep) {
      const aiOutput = await this.invokeAiAgentStep.run({
        promptWithContext: compiledPrompt,
        userPrompt: input.userPrompt,
        userId: input.userId,
        trace,
      });

      const assetPackId = await this.persistTypeScriptAssetStep.run({
        workspaceId: input.workspaceId,
        userId: input.userId,
        displayName: aiOutput.title,
        code: aiOutput.code,
        executionStatus: 'success',
        previewStatus: 'unverified',
        previewError: null,
        trace,
      });

      return {
        message: aiOutput.message,
        title: aiOutput.title,
        assetPackId,
      };
    }

    const packPlan = await this.planAssetPackStep.run({
      promptWithContext: `Create an asset pack plan for this user request.\n\nUser request:\n${input.userPrompt}\n\nCompiled runtime context:\n${compiledPrompt}`,
      userPrompt: input.userPrompt,
      userId: input.userId,
      trace,
    });

    const assetPackId = await this.persistTypeScriptAssetStep.createAssetPackShell({
      workspaceId: input.workspaceId,
      displayName: packPlan.title,
      packPlan,
      trace,
    });

    const parts = await this.generateAssetPartsStep.run({
      assetPackId,
      plan: packPlan,
      userPrompt: input.userPrompt,
      userId: input.userId,
      trace,
    });

    const code = composeAssetPackPreviewCode({
      plan: packPlan,
      parts,
    });

    const persistedAssetPackId = await this.persistTypeScriptAssetStep.persistPackPreview({
      assetPackId,
      userId: input.userId,
      code,
      executionStatus: 'success',
      previewStatus: 'unverified',
      previewError: null,
    });

    return {
      message: packPlan.message,
      title: packPlan.title,
      assetPackId: persistedAssetPackId,
    };
  }
}
