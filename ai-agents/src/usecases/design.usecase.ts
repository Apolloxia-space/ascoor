import type { IDesignRepository } from '../repositories/ai/design.repository';
import type { ITitleRepository } from '../repositories/ai/title.repository';
import type { DesignIn, DesignOut } from '../entities/design';
import { resolveTraceContext, type TraceContext } from '../repositories/ai/runtime';
import { InvokeError } from './errors';

export interface IDesignUsecase {
  run(input: DesignIn, traceContext?: TraceContext): Promise<DesignOut>;
}

export class DesignUsecase implements IDesignUsecase {
  constructor(
    private readonly designRepository: IDesignRepository,
    private readonly titleRepository: ITitleRepository,
  ) {}

  async run(input: DesignIn, traceContext?: TraceContext): Promise<DesignOut> {
    const trace = resolveTraceContext({
      requestId: input.requestId ?? traceContext?.requestId,
      traceId: input.traceId ?? traceContext?.traceId,
      designId: input.designId ?? traceContext?.designId,
    });

    try {
      const code = await this.designRepository.designCode({
        prompt: input.prompt,
        trace,
      });

      const titlePrompt = input.userPrompt?.trim() || input.prompt;
      const title = await this.titleRepository.designTitle({
        prompt: titlePrompt,
        trace,
      });

      return {
        message: 'Generated a message.',
        title,
        code,
      };
    } catch (error) {
      if (error instanceof InvokeError) {
        throw error;
      }
      const reason = error instanceof Error ? error.message : String(error);
      const code =
        reason === 'empty title'
          ? 'AI_AGENT_EMPTY_TITLE'
          : reason === 'empty code'
            ? 'AI_AGENT_EMPTY_CODE'
            : 'AI_AGENT_DESIGN_FAILED';
      const message =
        reason === 'empty title'
          ? 'Failed to design a title.'
          : reason === 'empty code'
            ? 'Model design did not return executable code.'
            : 'AI agent design failed.';
      throw new InvokeError({
        statusCode: 502,
        code,
        message,
        stage: 'design',
        requestId: trace.requestId,
        traceId: trace.traceId,
        designId: trace.designId || undefined,
        details: { failure_reason: reason },
      });
    }
  }
}
