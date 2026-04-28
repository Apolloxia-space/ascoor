type AiAssetPackTraceContext = {
  packGenerationJobId?: string;
  traceId?: string;
  requestId?: string;
};

export type AiAssetPackInput = {
  prompt: string;
  userPrompt: string;
  userId: string;
  skipTitle?: boolean;
  trace?: AiAssetPackTraceContext;
};

export type AiAssetPackResult = {
  message: string;
  title: string;
  code?: string;
};

export class AiAssetPackRepositoryError extends Error {
  readonly status?: number;
  readonly details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'AiAssetPackRepositoryError';
    this.status = status;
    this.details = details;
  }
}

export interface AiAssetPackRepository {
  assetPack(input: AiAssetPackInput): Promise<AiAssetPackResult>;
}
