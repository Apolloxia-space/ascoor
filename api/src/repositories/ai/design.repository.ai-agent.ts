import type { AiAgentConfig } from '../../config/ai-agent';
import { GcpIdTokenProvider } from '../../infra/gcp-id-token';
import type { AiDesignInput, AiDesignRepository, AiDesignResult } from './design.repository';
import { AiDesignRepositoryError } from './design.repository';

const DEFAULT_FAILURE_MESSAGE = 'No usable output was produced by the model.';

type AiAgentDesignResponse = {
  message?: string;
  title?: string;
  code?: string;
};

type AiAgentErrorResponse = {
  error?: unknown;
};

export class AiAgentDesignRepository implements AiDesignRepository {
  constructor(
    private readonly config: AiAgentConfig,
    private readonly idTokenProvider: GcpIdTokenProvider = new GcpIdTokenProvider(),
  ) {}

  async design(input: AiDesignInput): Promise<AiDesignResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const authHeader = await this.buildAuthHeader();
      const response = await fetch(new URL('/design', this.config.baseUrl), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(input.trace?.designId ? { 'x-design-id': input.trace.designId } : {}),
          ...(input.trace?.traceId ? { 'x-trace-id': input.trace.traceId } : {}),
          ...(input.trace?.requestId ? { 'x-origin-request-id': input.trace.requestId } : {}),
          ...(authHeader ? { authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          prompt: input.prompt,
          userPrompt: input.userPrompt,
          userId: input.userId,
          skipTitle: input.skipTitle,
          designId: input.trace?.designId,
          traceId: input.trace?.traceId,
          requestId: input.trace?.requestId,
        }),
        signal: controller.signal,
      });

      const payload = (await response.json()) as
        | (AiAgentDesignResponse & AiAgentErrorResponse)
        | null;
      if (!response.ok) {
        throw new AiDesignRepositoryError(`AI agent HTTP ${response.status}`, response.status);
      }

      if (!payload) {
        throw new AiDesignRepositoryError('AI agent error: Empty response body.');
      }

      if (payload.error) {
        throw new AiDesignRepositoryError('AI agent returned an error response', 502);
      }

      const title = payload.title?.trim();
      if (!title) {
        throw new AiDesignRepositoryError('Failed to design a title.');
      }

      const code = payload.code?.trim() ?? '';
      if (!code) {
        throw new AiDesignRepositoryError(DEFAULT_FAILURE_MESSAGE);
      }

      return {
        message: payload.message?.trim() ?? '',
        title,
        code,
      };
    } catch (error) {
      if (error instanceof AiDesignRepositoryError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new AiDesignRepositoryError(`AI agent request failed: ${message}`);
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
