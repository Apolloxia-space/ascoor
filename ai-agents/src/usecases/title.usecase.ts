import type { ITitleRepository } from '../repositories/ai/title.repository';
import type { DesignTitleIn, DesignTitleOut } from '../entities/title';
import { resolveTraceContext, type TraceContext } from '../repositories/ai/runtime';
import { InvokeError } from './errors';

function classifyTitleFailure(reason: string): [string, string] {
  if (reason === 'empty title') {
    return ['AI_AGENT_EMPTY_TITLE', 'Failed to design a title.'];
  }
  return ['AI_AGENT_DESIGN_FAILED', 'AI agent design failed.'];
}

export interface ITitleUsecase {
  run(input: DesignTitleIn, traceContext?: TraceContext): Promise<DesignTitleOut>;
}

export class TitleUsecase implements ITitleUsecase {
  constructor(private readonly titleRepository: ITitleRepository) {}

  async run(input: DesignTitleIn, traceContext?: TraceContext): Promise<DesignTitleOut> {
    const trace = resolveTraceContext({
      requestId: input.requestId ?? traceContext?.requestId,
      traceId: input.traceId ?? traceContext?.traceId,
      designId: input.designId ?? traceContext?.designId,
    });

    try {
      const title = await this.titleRepository.designTitle({
        prompt: input.prompt,
        trace,
      });
      return { title };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const [code, message] = classifyTitleFailure(reason);
      throw new InvokeError({
        statusCode: 502,
        code,
        message,
        stage: 'design_title',
        requestId: trace.requestId,
        traceId: trace.traceId,
        designId: trace.designId || undefined,
        details: { failure_reason: reason },
      });
    }
  }
}
