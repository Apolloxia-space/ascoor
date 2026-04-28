import type { AiAgentConfig } from '../../config/ai-agent';
import { GcpIdTokenProvider } from '../../infra/gcp-id-token';
import {
  AiPackPlanRepositoryError,
  type AiPackPlanInput,
  type AiPackPlanRepository,
  type AssetPackPlan,
} from './asset-pack-plan.repository';

type AiAgentErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    stage?: string;
    details?: unknown;
  };
};

const stringifyErrorDetail = (payload: AiAgentErrorResponse | null) => {
  const error = payload?.error;
  if (!error) return null;
  const code = error.code ? `code=${error.code}` : null;
  const stage = error.stage ? `stage=${error.stage}` : null;
  const message = error.message ? `message=${error.message}` : null;
  const details = error.details ? `details=${JSON.stringify(error.details)}` : null;
  return [code, stage, message, details].filter(Boolean).join(' ');
};

export class AiAgentPackPlanRepository implements AiPackPlanRepository {
  constructor(
    private readonly config: AiAgentConfig,
    private readonly idTokenProvider: GcpIdTokenProvider = new GcpIdTokenProvider(),
  ) {}

  async plan(input: AiPackPlanInput): Promise<AssetPackPlan> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const authHeader = await this.buildAuthHeader();
      const response = await fetch(new URL('/asset-pack-plan', this.config.baseUrl), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(input.trace?.packGenerationJobId ? { 'x-pack-generation-job-id': input.trace.packGenerationJobId } : {}),
          ...(input.trace?.traceId ? { 'x-trace-id': input.trace.traceId } : {}),
          ...(input.trace?.requestId ? { 'x-origin-request-id': input.trace.requestId } : {}),
          ...(authHeader ? { authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          prompt: input.prompt,
          userPrompt: input.userPrompt,
          userId: input.userId,
          packGenerationJobId: input.trace?.packGenerationJobId,
          traceId: input.trace?.traceId,
          requestId: input.trace?.requestId,
        }),
        signal: controller.signal,
      });

      const payload = (await response.json()) as (AssetPackPlan & AiAgentErrorResponse) | null;
      if (!response.ok) {
        const detail = stringifyErrorDetail(payload);
        throw new AiPackPlanRepositoryError(
          detail
            ? `AI agent pack plan HTTP ${response.status}: ${detail}`
            : `AI agent pack plan HTTP ${response.status}`,
          response.status,
          payload?.error,
        );
      }
      if (!payload) {
        throw new AiPackPlanRepositoryError('AI agent pack plan error: Empty response body.');
      }
      if (payload.error) {
        throw new AiPackPlanRepositoryError('AI agent returned a pack plan error response.', 502);
      }
      if (!Array.isArray(payload.parts) || payload.parts.length === 0) {
        throw new AiPackPlanRepositoryError('AI agent returned an empty pack plan.');
      }
      return payload;
    } catch (error) {
      if (error instanceof AiPackPlanRepositoryError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new AiPackPlanRepositoryError(`AI agent pack plan request failed: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async buildAuthHeader(): Promise<string | null> {
    if (!this.config.useIdToken) return null;
    const token = await this.idTokenProvider.getIdToken(this.config.idTokenAudience);
    if (!token) {
      throw new Error('Failed to obtain ID token for ai-agent.');
    }
    return `Bearer ${token}`;
  }
}
