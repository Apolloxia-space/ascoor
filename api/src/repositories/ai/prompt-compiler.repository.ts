type PromptCompileTraceContext = {
  designId?: string;
  traceId?: string;
  requestId?: string;
};

export type PromptCompileInput = {
  userPrompt: string;
  userId: string;
  trace?: PromptCompileTraceContext;
};

export type PromptCompileResult = {
  compiledPrompt: string;
};

export class PromptCompilerRepositoryError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'PromptCompilerRepositoryError';
    this.status = status;
  }
}

export interface PromptCompilerRepository {
  compile(input: PromptCompileInput): Promise<PromptCompileResult>;
}
