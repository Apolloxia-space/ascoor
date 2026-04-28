import { AssetPackValidationError } from '../../usecases/errors';

export const DEFAULT_FAILURE_TITLE = 'Pack generation failed';

export type AssetPackStage =
  | 'API_ENQUEUE_VALIDATE'
  | 'API_TASK_ENQUEUE'
  | 'WORKER_CLAIM'
  | 'PROMPT_COMPILE'
  | 'PACK_PLAN'
  | 'PART_GENERATION'
  | 'AI_AGENT_INVOKE'
  | 'ASSET_PERSIST_TS'
  | 'PACK_GENERATION_FINALIZE';

export class AssetPackPipelineError extends AssetPackValidationError {
  readonly stage: AssetPackStage;
  readonly errorCode: string;
  readonly assetPackId: string | null;

  constructor(
    stage: AssetPackStage,
    errorCode: string,
    message: string,
    assetPackId: string | null = null,
  ) {
    super(message);
    this.name = 'AssetPackPipelineError';
    this.stage = stage;
    this.errorCode = errorCode;
    this.assetPackId = assetPackId;
  }
}

export type AssetPackTraceContext = {
  requestId?: string | null;
  traceId?: string | null;
  packGenerationJobId?: string | null;
};

export type AssetPackPipelineRunInput = {
  packGenerationJobId: string;
  workspaceId: string;
  userPrompt: string;
  userId: string;
};

export type AssetPackPipelineResult = {
  message: string;
  title: string;
  assetPackId: string;
};

export type AiInvokeOutput = {
  message: string;
  title: string;
  code: string;
};
