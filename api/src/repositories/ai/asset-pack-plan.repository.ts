export type AssetPackPartPlan = {
  slug: string;
  displayName: string;
  description: string;
  prompt: string;
};

export type AssetPackPlan = {
  title: string;
  message: string;
  parts: Array<AssetPackPartPlan>;
};

type AiPackPlanTraceContext = {
  designId?: string;
  traceId?: string;
  requestId?: string;
};

export type AiPackPlanInput = {
  prompt: string;
  userPrompt: string;
  userId: string;
  trace?: AiPackPlanTraceContext;
};

export class AiPackPlanRepositoryError extends Error {
  readonly status?: number;
  readonly details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'AiPackPlanRepositoryError';
    this.status = status;
    this.details = details;
  }
}

export interface AiPackPlanRepository {
  plan(input: AiPackPlanInput): Promise<AssetPackPlan>;
}
