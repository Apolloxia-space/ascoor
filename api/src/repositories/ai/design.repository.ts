type AiDesignTraceContext = {
  designId?: string;
  traceId?: string;
  requestId?: string;
};

export type AiDesignInput = {
  prompt: string;
  userPrompt: string;
  userId: string;
  trace?: AiDesignTraceContext;
};

export type AiDesignResult = {
  message: string;
  title: string;
  code?: string;
};

export class AiDesignRepositoryError extends Error {
  readonly status?: number;
  readonly details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'AiDesignRepositoryError';
    this.status = status;
    this.details = details;
  }
}

export interface AiDesignRepository {
  design(input: AiDesignInput): Promise<AiDesignResult>;
}
