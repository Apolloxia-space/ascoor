import type { AiAgentConfig } from '../../config/ai-agent';
import { GcpIdTokenProvider } from '../../infra/gcp-id-token';
import type { AiAssetPackInput, AiAssetPackRepository, AiAssetPackResult } from './assetPack.repository';
import { AiAssetPackRepositoryError } from './assetPack.repository';

const DEFAULT_FAILURE_MESSAGE = 'No usable output was produced by the model.';

type AiAgentAssetPackResponse = {
  message?: string;
  title?: string;
  code?: string;
};

type AiAgentErrorResponse = {
  error?: unknown;
};

export class AiAgentAssetPackRepository implements AiAssetPackRepository {
  constructor(
    private readonly config: AiAgentConfig,
    private readonly idTokenProvider: GcpIdTokenProvider = new GcpIdTokenProvider(),
  ) {}

  async assetPack(input: AiAssetPackInput): Promise<AiAssetPackResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const authHeader = await this.buildAuthHeader();
      const response = await fetch(new URL('/asset-pack', this.config.baseUrl), {
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
          skipTitle: input.skipTitle,
          packGenerationJobId: input.trace?.packGenerationJobId,
          traceId: input.trace?.traceId,
          requestId: input.trace?.requestId,
        }),
        signal: controller.signal,
      });

      const payload = (await response.json()) as
        | (AiAgentAssetPackResponse & AiAgentErrorResponse)
        | null;
      if (!response.ok) {
        throw new AiAssetPackRepositoryError(`AI agent HTTP ${response.status}`, response.status);
      }

      if (!payload) {
        throw new AiAssetPackRepositoryError('AI agent error: Empty response body.');
      }

      if (payload.error) {
        throw new AiAssetPackRepositoryError('AI agent returned an error response', 502);
      }

      const title = payload.title?.trim();
      if (!title) {
        throw new AiAssetPackRepositoryError('Failed to create an asset pack title.');
      }

      const code = payload.code?.trim() ?? '';
      if (!code) {
        throw new AiAssetPackRepositoryError(DEFAULT_FAILURE_MESSAGE);
      }

      return {
        message: payload.message?.trim() ?? '',
        title,
        code,
      };
    } catch (error) {
      if (error instanceof AiAssetPackRepositoryError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new AiAssetPackRepositoryError(`AI agent request failed: ${message}`);
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
