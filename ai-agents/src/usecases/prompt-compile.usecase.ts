import type { IPromptCompileRepository } from '../repositories/prompt-compile.repository';
import type { CompilePromptIn } from '../entities/prompt-compile';
import { resolveTraceContext, type TraceContext } from '../repositories/ai/runtime';

export interface IPromptCompileUsecase {
  run(input: CompilePromptIn, traceContext?: TraceContext): Promise<string>;
}

export class PromptCompileUsecase implements IPromptCompileUsecase {
  constructor(private readonly promptCompileRepository: IPromptCompileRepository) {}

  async run(input: CompilePromptIn, traceContext?: TraceContext): Promise<string> {
    const trace = resolveTraceContext({
      requestId: input.requestId ?? traceContext?.requestId,
      traceId: input.traceId ?? traceContext?.traceId,
      packGenerationJobId: input.packGenerationJobId ?? traceContext?.packGenerationJobId,
    });

    const prompt = input.userPrompt.trim();
    if (!prompt) return '';

    const compiledPrompt = await this.promptCompileRepository.compilePrompt({
      userPrompt: prompt,
      trace,
    });

    return compiledPrompt;
  }
}
