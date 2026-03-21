import { DesignValidationError } from '../../usecases/errors';

export const DEFAULT_FAILURE_TITLE = 'Design failed';

export type DesignStage =
  | 'API_ENQUEUE_VALIDATE'
  | 'API_TASK_ENQUEUE'
  | 'WORKER_CLAIM'
  | 'PROMPT_COMPILE'
  | 'AI_AGENT_INVOKE'
  | 'ASSET_PERSIST_TS'
  | 'DESIGN_FINALIZE';

export class DesignPipelineError extends DesignValidationError {
  readonly stage: DesignStage;
  readonly errorCode: string;
  readonly designId: string | null;

  constructor(
    stage: DesignStage,
    errorCode: string,
    message: string,
    designId: string | null = null,
  ) {
    super(message);
    this.name = 'DesignPipelineError';
    this.stage = stage;
    this.errorCode = errorCode;
    this.designId = designId;
  }
}

export type DesignTraceContext = {
  requestId?: string | null;
  traceId?: string | null;
  designId?: string | null;
};

export type DesignPipelineRunInput = {
  designId: string;
  projectId: string;
  userPrompt: string;
  userId: string;
};

export type DesignPipelineResult = {
  message: string;
  title: string;
  designId: string;
};

export type AiInvokeOutput = {
  message: string;
  title: string;
  code: string;
};
