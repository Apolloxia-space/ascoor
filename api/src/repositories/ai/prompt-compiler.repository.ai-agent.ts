import type { AiAgentConfig } from '../../config/ai-agent';
import { GcpIdTokenProvider } from '../../infra/gcp-id-token';
import {
  type PromptCompilerRepository,
  PromptCompilerRepositoryError,
  type PromptCompileInput,
  type PromptCompileResult,
} from './prompt-compiler.repository';

type AiAgentCompileResponse = {
  compiledPrompt?: string;
};

type AiAgentErrorResponse = {
  error?: unknown;
};

export class AiAgentPromptCompilerRepository implements PromptCompilerRepository {
  constructor(
    private readonly config: AiAgentConfig,
    private readonly idTokenProvider: GcpIdTokenProvider = new GcpIdTokenProvider(),
  ) {}

  async compile(input: PromptCompileInput): Promise<PromptCompileResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const authHeader = await this.buildAuthHeader();
      const response = await fetch(new URL('/compile-prompt', this.config.baseUrl), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(input.trace?.packGenerationJobId ? { 'x-pack-generation-job-id': input.trace.packGenerationJobId } : {}),
          ...(input.trace?.traceId ? { 'x-trace-id': input.trace.traceId } : {}),
          ...(input.trace?.requestId ? { 'x-origin-request-id': input.trace.requestId } : {}),
          ...(authHeader ? { authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          userPrompt: input.userPrompt,
          userId: input.userId,
          packGenerationJobId: input.trace?.packGenerationJobId,
          traceId: input.trace?.traceId,
          requestId: input.trace?.requestId,
        }),
        signal: controller.signal,
      });

      const payload = (await response.json()) as
        | (AiAgentCompileResponse & AiAgentErrorResponse)
        | null;
      if (!response.ok) {
        throw new PromptCompilerRepositoryError(
          `AI agent HTTP ${response.status}`,
          response.status,
        );
      }
      if (!payload) {
        throw new PromptCompilerRepositoryError('AI agent error: Empty response body.');
      }
      if (payload.error) {
        throw new PromptCompilerRepositoryError('AI agent returned an error response', 502);
      }

      const compiledPrompt = payload.compiledPrompt?.trim() ?? '';
      if (!compiledPrompt) {
        throw new PromptCompilerRepositoryError('Compiled prompt is empty.', 502);
      }

      return { compiledPrompt };
    } catch (error) {
      if (error instanceof PromptCompilerRepositoryError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new PromptCompilerRepositoryError(`Prompt compile request failed: ${message}`);
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
