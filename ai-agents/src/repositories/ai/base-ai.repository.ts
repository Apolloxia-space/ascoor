import { BaseAiRuntimeRepository, type ResolvedTraceContext } from './runtime';
import type { AiDomainSettings } from '../../entities/ai-domain';

export abstract class BaseAiRepository extends BaseAiRuntimeRepository {
  protected async invokeDomainModel(params: {
    prompt: string;
    trace: ResolvedTraceContext;
    settings: AiDomainSettings;
  }): Promise<string> {
    return this.callLlm({
      prompt: params.prompt,
      modelProfile: params.settings.modelProfile,
      systemInstruction: params.settings.systemInstruction,
      trace: params.trace,
      stage: params.settings.stage,
    });
  }
}
