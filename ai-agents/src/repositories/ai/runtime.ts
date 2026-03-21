import { randomUUID } from 'node:crypto';
import type OpenAI from 'openai';
import { config } from '../../config';
import type { AiDomainModelProfile, AiDomainStage } from '../../entities/ai-domain';
import { logEvent } from '../../logger';

export type TraceContext = {
  requestId?: string | null;
  traceId?: string | null;
  designId?: string | null;
};

export type ResolvedTraceContext = {
  requestId: string;
  traceId: string;
  designId: string | null;
};

export function resolveTraceContext(input: TraceContext = {}): ResolvedTraceContext {
  const requestId = input.requestId?.trim() || randomUUID();
  const designId = input.designId?.trim() || null;
  const traceId = input.traceId?.trim() || designId || requestId;
  return { requestId, traceId, designId };
}

export abstract class BaseAiRuntimeRepository {
  constructor(private readonly openAiClient: OpenAI) {}

  protected async callLlm(params: {
    prompt: string;
    modelProfile?: AiDomainModelProfile;
    systemInstruction?: string;
    trace: ResolvedTraceContext;
    stage: AiDomainStage;
  }): Promise<string> {
    const profile = params.modelProfile || 'primary';
    const selectedModel = profile === 'secondary' ? config.secondaryModel : config.primaryModel;
    const model = selectedModel.modelKey;
    const provider = 'openai';
    const temperature = selectedModel.temperature;

    const prompt = params.prompt.trim();
    const fullPrompt = params.systemInstruction?.trim()
      ? `${params.systemInstruction.trim()}\n\n${prompt}`
      : prompt;

    const startedAt = Date.now();
    logEvent('ai_agent.llm.request', {
      request_id: params.trace.requestId,
      trace_id: params.trace.traceId,
      design_id: params.trace.designId,
      stage: params.stage,
      provider,
      model,
      temperature,
    });

    const response = await this.openAiClient.responses.create({
      model,
      input: fullPrompt,
      temperature,
    });
    const text = typeof response.output_text === 'string' ? response.output_text.trim() : '';

    logEvent('ai_agent.llm.response', {
      request_id: params.trace.requestId,
      trace_id: params.trace.traceId,
      design_id: params.trace.designId,
      stage: params.stage,
      provider,
      model,
      latency_ms: Date.now() - startedAt,
    });

    return text;
  }
}
