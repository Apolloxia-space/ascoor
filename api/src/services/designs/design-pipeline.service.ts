import type { AiDesignRepository } from '../../repositories/ai/design.repository';
import type { PromptCompilerRepository } from '../../repositories/ai/prompt-compiler.repository';
import type { IGcsRepository, IDesignRepository } from '../../repositories/interfaces';
import type { ProjectRepository } from '../../repositories/postgres/project.repository';
import type { DesignJobRepositoryPostgres } from '../../repositories/postgres/design-job.repository';
import { NotFoundError } from '../../usecases/errors';
import {
  CompilePromptStep,
  InvokeAiAgentStep,
  PersistTypeScriptAssetStep,
} from './design-pipeline.steps';
import type {
  DesignPipelineResult,
  DesignPipelineRunInput,
  DesignTraceContext,
} from './design-pipeline.types';

export type {
  DesignPipelineResult,
  DesignPipelineRunInput,
  DesignStage,
  DesignTraceContext,
} from './design-pipeline.types';
export { DesignPipelineError } from './design-pipeline.types';

type DesignPipelineDeps = {
  aiRepository: AiDesignRepository;
  designRepository: IDesignRepository;
  projectRepository: ProjectRepository;
  gcsRepository: IGcsRepository;
  designJobRepository: DesignJobRepositoryPostgres;
  promptCompilerRepository?: PromptCompilerRepository;
};

export class DesignPipelineService {
  private readonly compilePromptStep: CompilePromptStep;
  private readonly invokeAiAgentStep: InvokeAiAgentStep;
  private readonly persistTypeScriptAssetStep: PersistTypeScriptAssetStep;

  constructor(private readonly deps: DesignPipelineDeps) {
    this.compilePromptStep = new CompilePromptStep(
      deps.designJobRepository,
      deps.promptCompilerRepository,
    );
    this.invokeAiAgentStep = new InvokeAiAgentStep(deps.aiRepository);
    this.persistTypeScriptAssetStep = new PersistTypeScriptAssetStep(
      deps.designRepository,
      deps.designJobRepository,
      deps.gcsRepository,
    );
  }

  async run(
    input: DesignPipelineRunInput,
    traceContext: DesignTraceContext,
  ): Promise<DesignPipelineResult> {
    const requestId = traceContext.requestId ?? null;
    const designJobId = traceContext.designId ?? input.designId;
    const traceId = traceContext.traceId ?? requestId ?? designJobId;
    const trace: DesignTraceContext = {
      requestId,
      traceId,
      designId: designJobId,
    };

    const project = await this.deps.projectRepository.getOwned(input.projectId, input.userId);
    if (!project) {
      throw new NotFoundError('project not found');
    }

    const compiledPrompt = await this.compilePromptStep.run({
      designId: input.designId,
      userPrompt: input.userPrompt,
      userId: input.userId,
      trace,
    });

    const aiOutput = await this.invokeAiAgentStep.run({
      promptWithContext: compiledPrompt,
      userPrompt: input.userPrompt,
      userId: input.userId,
      trace,
    });

    const designId = await this.persistTypeScriptAssetStep.run({
      projectId: input.projectId,
      userId: input.userId,
      displayName: aiOutput.title,
      code: aiOutput.code,
      executionStatus: 'success',
      assetStatus: 'succeeded',
      assetError: null,
      trace,
    });

    return {
      message: aiOutput.message,
      title: aiOutput.title,
      designId,
    };
  }
}
